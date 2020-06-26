import React from "react";
import "./App.css";
import axios from "axios";
import Accordion from "./components/Accordion";
import $ from "jquery";
import ReactDOM from "react-dom";
import ReactTypingEffect from "react-typing-effect";

import "react-loader-spinner/dist/loader/css/react-spinner-loader.css";
import Loader from "react-loader-spinner";

class App extends React.Component {
  state = {
    innerFolder: [],
    folders: [],
    result: [],
    data_faqid: "",
    isLoader: false,
    value: '',
  };

  componentDidMount() {
    this.setState({ isLoader: true });
    axios
      .get(`${process.env.REACT_APP_BASE_URL}/Faq-Get?id=faqid`)
      .then((res) => {
        const result = res.data.result;
        this.setState({ result });
        const folders = result.filter(el => el.isFolder)
        this.setState({ folders });
      })
      .then(() => this.setState({ isLoader: false }));

    $(document).ready(function () {
      $("#sidebarCollapse").on("click", function () {
        $("#sidebar").toggleClass("active");
      });
    });
  }

  renderElement = (faqid, target) => {
    return (
      <>
        <a
          onClick={(event) =>
            this.onNameChange(
              event.target.getAttribute("data-faqid"),
              event.target
            )
          }
          data-faqid={faqid}
        >
          {target.innerText}
        </a>
        <ul>
          {this.state.innerFolder.map((el) => (
            <li>
              <a
                onClick={(event) =>
                  this.onNameChange(
                    event.target.getAttribute("data-faqid"),
                    event.target
                  )
                }
                data-faqid={el?.id}
              >
                {el?.name}
              </a>
            </li>
          ))}
        </ul>
      </>
    );
  };

  onNameChange = (faqid, target) => {
    this.setState({ isLoader: true });
    axios
      .get(
        `${process.env.REACT_APP_BASE_URL}/Faq-GetSubcategory?id=faqid&catid=${faqid}`
      )
      .then((res) => {
        const result = res.data.result;
        const innerFolder = result.filter((el) => el.isFolder);

        this.setState({ result, innerFolder });
        ReactDOM.render(this.renderElement(faqid, target), target.parentNode);
      })
      .then(() => this.setState({ isLoader: false }));
  };

  handleSubmit = (event) => {
    event.preventDefault();
    this.setState({ isLoader: true });
    var value = event.target.value;
      axios
        .get(`${process.env.REACT_APP_BASE_URL}/Faq-Search?q=${this.state.value}`)
        .then((res) => {
          const result = res.data.result;
          this.setState({ result });
          const folders = result.filter(el => el.isFolder)
          this.setState({ folders });
        })
        .then(() => this.setState({ isLoader: false }))
  };

  handleChange = (event) => {
    this.setState({value: event.target.value});
  }

  render() {
    return (
      <div className="App">
        <div class="wrapper">
          <nav id="sidebar">
            <div class="sidebar-header">
              <h3>FAQ APP!</h3>
              <form onSubmit={this.handleSubmit}>
                <input type="text" id="name" name="name" value={this.state.value} onChange={this.handleChange}  minlength="4" maxlength="8" size="10" />
                <button>Search </button>
              </form>
            </div>
            <p class="category-title">Categories:</p>
            <ul class="list-unstyled components">
              <li>
                <a
                  onClick={(event) => window.location.reload(false)}
                  data-faqid="faqid"
                >
                  faqid
                </a>
              </li>
              {this.state.folders.map((el) => {
                return (
                  <li>
                    <a
                      onClick={(event) =>
                        this.onNameChange(
                          event.target.getAttribute("data-faqid"),
                          event.target
                        )
                      }
                      data-faqid={el?.id}
                    >
                      {el?.name}
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div class="content">
            <nav class="navbar navbar-expand-lg navbar-light bg-light">
              <div class="container-fluid">
                <button type="button" id="sidebarCollapse" class="btn btn-info">
                  <i class="fas fa-align-left"></i>
                  <span>Toggle Sidebar</span>
                </button>
              </div>
            </nav>
          </div>

          <div className="container-lg">
            {!this.state.isLoader ? (
              this.state.result.map(function (item) {
                if (!item.isFolder) {
                  return (
                    <div>
                      <Accordion
                        title={item.faqQuestion}
                        content={item.faqAnswer}
                      />
                    </div>
                  );
                }
              })
            ) : (
              <Loader
                type="Puff"
                color="#00BFFF"
                height={200}
                width={200}
                className="loader"
                timeout={3000}
              />
            )}
          </div>

          {!this.state.isLoader ? (
            <ReactTypingEffect speed="100" className="typer" text="No requested assets, yet...." />
          ) : (
            ""
          )}
        </div>
      </div>
    );
  }
}

export default App;
