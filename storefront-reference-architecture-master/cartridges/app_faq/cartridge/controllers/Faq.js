'use strict';

var server = require('server');

server.get(
    'Get',
    function (req, res, next) {
        var params = req.querystring; 
        var folderID = params.id;
        var ContentSearchModel = require('dw/content/ContentSearchModel');
        var apiContentSearchModel = new ContentSearchModel();
        var result = [];
        var folderSearchResult = null;

        apiContentSearchModel.setRecursiveFolderSearch(true);        
        apiContentSearchModel.setFolderID(folderID);
        apiContentSearchModel.search();
        folderSearchResult = apiContentSearchModel.getFolder();       
        
        folderSearchResult.onlineSubFolders.toArray().map(function(folder) {
            var el = {
                id: folder.ID,
                name: folder.displayName,
                isFolder: true
            };
            result.push(el);
        });
        folderSearchResult.onlineContent.toArray().map(function(asset) {
            var el = {
                id: asset.ID,
                name: asset.name,
                isFolder: false,
                faqAnswer: asset.custom.faqAnswer.markup,
                faqQuestion: asset.custom.faqQuestion
            };
            result.push(el);
        });
        var viewData = {result: result};
        res.json( viewData );
        
        next();
    }
);

server.get(
    'GetSubcategory',
    function (req, res, next) {
        var params = req.querystring; 
        var folderID = params.id;
        var subFolderID = params.catid
        var ContentSearchModel = require('dw/content/ContentSearchModel');
        var apiContentSearchModel = new ContentSearchModel();
        var result = [];
        var folderSearchResult = null;

        apiContentSearchModel.setRecursiveFolderSearch(true);        
        apiContentSearchModel.setFolderID(subFolderID);
        apiContentSearchModel.search();
        folderSearchResult = apiContentSearchModel.getFolder();       
        
        folderSearchResult.onlineSubFolders.toArray().map(function(folder) {
            var el = {
                id: folder.ID,
                name: folder.displayName,
                isFolder: true
            };
            result.push(el);
        });
        folderSearchResult.onlineContent.toArray().map(function(asset) {
            var el = {
                id: asset.ID,
                name: asset.name,
                isFolder: false,
                faqAnswer: asset.custom.faqAnswer.markup,
                faqQuestion: asset.custom.faqQuestion
            };
            result.push(el);
        });
        var viewData = {result: result};
        res.json( viewData );
        
        next();
    }
);

server.get(
    'Search',
    function (req, res, next) {
        var params = req.querystring;
        var search = params.q;
        var ContentSearchModel = require('dw/content/ContentSearchModel');
        var apiContentSearchModel = new ContentSearchModel();
        var result = [];

        apiContentSearchModel.setRecursiveFolderSearch(true);        
        apiContentSearchModel.setSearchPhrase(search);
        apiContentSearchModel.search(); 
        var contentSearchResult = apiContentSearchModel.getContent(); 

        while (contentSearchResult !== null && contentSearchResult.hasNext()) {
            var contentAsset = contentSearchResult.next();
            var elAsset = {
                id: contentAsset.ID,
                name: contentAsset.name,
                isFolder: false,
                faqAnswer: contentAsset.custom.faqAnswer.markup,
                faqQuestion: contentAsset.custom.faqQuestion
            };
            result.push(elAsset);
            contentAsset.folders.toArray().map(function(folder) {
                var elFolder = {
                    id: folder.ID,
                    name: folder.displayName,
                    isFolder: true
                }
                if (folder.ID !== "faqid") {
                    result.push(elFolder);
                }
            });
            
        }
        var viewData = {result: result};
        res.json( viewData );
        
        next();
    }
);

module.exports = server.exports();
