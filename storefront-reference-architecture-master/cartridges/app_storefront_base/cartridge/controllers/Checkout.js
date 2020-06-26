'use strict';

var server = require('server');

var COHelpers = require('../../../app_faq/cartridge/controllers/node_modules/*/cartridge/scripts/checkout/checkoutHelpers');
var csrfProtection = require('../../../app_faq/cartridge/controllers/node_modules/*/cartridge/scripts/middleware/csrf');
var consentTracking = require('../../../app_faq/cartridge/controllers/node_modules/*/cartridge/scripts/middleware/consentTracking');

/**
 * Main entry point for Checkout
 */

server.get(
    'Login',
    server.middleware.https,
    consentTracking.consent,
    csrfProtection.generateToken,
    function (req, res, next) {
        var BasketMgr = require('../../../app_faq/cartridge/controllers/node_modules/dw/order/BasketMgr');
        var ProductLineItemsModel = require('../../../app_faq/cartridge/controllers/node_modules/*/cartridge/models/productLineItems');
        var TotalsModel = require('../../../app_faq/cartridge/controllers/node_modules/*/cartridge/models/totals');
        var URLUtils = require('../../../app_faq/cartridge/controllers/node_modules/dw/web/URLUtils');
        var reportingUrlsHelper = require('../../../app_faq/cartridge/controllers/node_modules/*/cartridge/scripts/reportingUrls');
        var validationHelpers = require('../../../app_faq/cartridge/controllers/node_modules/*/cartridge/scripts/helpers/basketValidationHelpers');

        var currentBasket = BasketMgr.getCurrentBasket();
        var reportingURLs;

        if (!currentBasket) {
            res.redirect(URLUtils.url('Cart-Show'));
            return next();
        }

        var validatedProducts = validationHelpers.validateProducts(currentBasket);
        if (validatedProducts.error) {
            res.redirect(URLUtils.url('Cart-Show'));
            return next();
        }

        if (req.currentCustomer.profile) {
            res.redirect(URLUtils.url('Checkout-Begin'));
        } else {
            var rememberMe = false;
            var userName = '';
            var actionUrl = URLUtils.url('Account-Login', 'rurl', 2);
            var totalsModel = new TotalsModel(currentBasket);
            var details = {
                subTotal: totalsModel.subTotal,
                totalQuantity: ProductLineItemsModel.getTotalQuantity(
                    currentBasket.productLineItems
                )
            };

            if (req.currentCustomer.credentials) {
                rememberMe = true;
                userName = req.currentCustomer.credentials.username;
            }

            reportingURLs = reportingUrlsHelper.getCheckoutReportingURLs(
                currentBasket.UUID,
                1,
                'CheckoutMethod'
            );

            res.render('/checkout/checkoutLogin', {
                rememberMe: rememberMe,
                userName: userName,
                actionUrl: actionUrl,
                details: details,
                reportingURLs: reportingURLs,
                oAuthReentryEndpoint: 2
            });
        }

        return next();
    }
);


// Main entry point for Checkout
server.get(
    'Begin',
    server.middleware.https,
    consentTracking.consent,
    csrfProtection.generateToken,
    function (req, res, next) {
        var BasketMgr = require('../../../app_faq/cartridge/controllers/node_modules/dw/order/BasketMgr');
        var Transaction = require('../../../app_faq/cartridge/controllers/node_modules/dw/system/Transaction');
        var AccountModel = require('../../../app_faq/cartridge/controllers/node_modules/*/cartridge/models/account');
        var OrderModel = require('../../../app_faq/cartridge/controllers/node_modules/*/cartridge/models/order');
        var URLUtils = require('../../../app_faq/cartridge/controllers/node_modules/dw/web/URLUtils');
        var reportingUrlsHelper = require('../../../app_faq/cartridge/controllers/node_modules/*/cartridge/scripts/reportingUrls');
        var Locale = require('../../../app_faq/cartridge/controllers/node_modules/dw/util/Locale');
        var collections = require('../../../app_faq/cartridge/controllers/node_modules/*/cartridge/scripts/util/collections');
        var validationHelpers = require('../../../app_faq/cartridge/controllers/node_modules/*/cartridge/scripts/helpers/basketValidationHelpers');

        var currentBasket = BasketMgr.getCurrentBasket();
        if (!currentBasket) {
            res.redirect(URLUtils.url('Cart-Show'));
            return next();
        }

        var validatedProducts = validationHelpers.validateProducts(currentBasket);
        if (validatedProducts.error) {
            res.redirect(URLUtils.url('Cart-Show'));
            return next();
        }

        var currentStage = req.querystring.stage ? req.querystring.stage : 'shipping';

        var billingAddress = currentBasket.billingAddress;

        var currentCustomer = req.currentCustomer.raw;
        var currentLocale = Locale.getLocale(req.locale.id);
        var preferredAddress;

        // only true if customer is registered
        if (req.currentCustomer.addressBook && req.currentCustomer.addressBook.preferredAddress) {
            var shipments = currentBasket.shipments;
            preferredAddress = req.currentCustomer.addressBook.preferredAddress;

            collections.forEach(shipments, function (shipment) {
                if (!shipment.shippingAddress) {
                    COHelpers.copyCustomerAddressToShipment(preferredAddress, shipment);
                }
            });

            if (!billingAddress) {
                COHelpers.copyCustomerAddressToBilling(preferredAddress);
            }
        }

        // Calculate the basket
        Transaction.wrap(function () {
            COHelpers.ensureNoEmptyShipments(req);
        });

        if (currentBasket.shipments.length <= 1) {
            req.session.privacyCache.set('usingMultiShipping', false);
        }

        if (currentBasket.currencyCode !== req.session.currency.currencyCode) {
            Transaction.wrap(function () {
                currentBasket.updateCurrency();
            });
        }

        COHelpers.recalculateBasket(currentBasket);

        var shippingForm = COHelpers.prepareShippingForm(currentBasket);
        var billingForm = COHelpers.prepareBillingForm(currentBasket);
        var usingMultiShipping = req.session.privacyCache.get('usingMultiShipping');

        if (preferredAddress) {
            shippingForm.copyFrom(preferredAddress);
            billingForm.copyFrom(preferredAddress);
        }

        // Loop through all shipments and make sure all are valid
        var allValid = COHelpers.ensureValidShipments(currentBasket);

        var orderModel = new OrderModel(
            currentBasket,
            {
                customer: currentCustomer,
                usingMultiShipping: usingMultiShipping,
                shippable: allValid,
                countryCode: currentLocale.country,
                containerView: 'basket'
            }
        );

        // Get rid of this from top-level ... should be part of OrderModel???
        var currentYear = new Date().getFullYear();
        var creditCardExpirationYears = [];

        for (var j = 0; j < 10; j++) {
            creditCardExpirationYears.push(currentYear + j);
        }

        var accountModel = new AccountModel(req.currentCustomer);

        var reportingURLs;
        reportingURLs = reportingUrlsHelper.getCheckoutReportingURLs(
            currentBasket.UUID,
            2,
            'Shipping'
        );

        res.render('checkout/checkout', {
            order: orderModel,
            customer: accountModel,
            forms: {
                shippingForm: shippingForm,
                billingForm: billingForm
            },
            expirationYears: creditCardExpirationYears,
            currentStage: currentStage,
            reportingURLs: reportingURLs
        });

        return next();
    }
);


module.exports = server.exports();
