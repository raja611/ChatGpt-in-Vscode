(function () {
  const vscode = acquireVsCodeApi();

  window.addEventListener("message", (event) => {
    const message = event.data;
    switch (message.type) {
      case "receiveAns": {
        addRecievedAnswer(message.value);
        break;
      }
      case "addQuestion": {
        addQuestion(message.value);
        break;
      }
      case "enableBtn": {
        enableBtn();
        break;
      }
    }
  });

  document.getElementById("sendBtn").addEventListener("click", function (e) {
    handleInput();
  });

  document.getElementById("clearBtn").addEventListener("click", function (e) {
    document.getElementById("response").innerHTML = "";
  });

  document.getElementById("input-prompt").addEventListener("keypress", function (e) {
    if (e.keyCode === 13 ) {
      e.preventDefault();
      handleInput();
    }
  });

  function handleInput() {
    if (document.getElementById("input-prompt").value) {
      document.getElementById(
        "sendBtn"
      ).innerHTML = `<i  class="fas fa-stop"></i>`;
      document.getElementById("sendBtn").setAttribute("disabled", "");
      vscode.postMessage({
        type: "sendQtn",
        value: document.getElementById("input-prompt").value,
      });
    }
    document.getElementById("input-prompt").value = "";
  }

  function enableBtn() {
    document.getElementById(
      "sendBtn"
    ).innerHTML = `<i class="fas fa-paper-plane">`;
    document.getElementById("sendBtn").removeAttribute("disabled");
  }

  function addRecievedAnswer(msg) {
    document.getElementById("response").innerHTML += `<div>
    <div class="container-fluid" style="background-color: #252525;">
      <div class="d-inline-block p-3 d-inline">
        <i class="fa-solid fa-robot fa-xl" style="color: #ffffff;"></i>
        <div class="d-inline p-3 text-light">ChatGPT</div>
      </div>
      <div class="text-light p-3 pt-0" id="ans">
        ${addCode(msg)}
      </div>
    </div>
</div>`;

  }

  function addQuestion(msg) {
    document.getElementById(
      "response"
    ).innerHTML += `<div class="container-fluid">
    <div class="d-inline-block p-3 d-inline">
      <i class="fa-solid fa-user fa-xl" style="color: #ffffff;"></i>
      <div class="d-inline p-3 text-light">You</div>
    </div>
    <div id="qtn" class="text-light p-3 pt-0">
      ${msg}
    </div>
  </div>`;
  }
  function fixCodeBlocks(response) {
    const REGEX_CODEBLOCK = new RegExp("```", "g");
    const matches = response.match(REGEX_CODEBLOCK);
    const count = matches ? matches.length : 0;
    if (count % 2 === 0) {
      return response;
    } else {
      return response.concat("\n```");
    }
  }

  function addCode(msg) {
    var converter = new showdown.Converter({
      omitExtraWLInCodeBlocks: true,
      simplifiedAutoLink: true,
      excludeTrailingPunctuationFromURLs: true,
      literalMidWordUnderscores: true,
      simpleLineBreaks: true,
    });
    response = fixCodeBlocks(msg);
    html = converter.makeHtml(response);
    return html;
  }
})();
