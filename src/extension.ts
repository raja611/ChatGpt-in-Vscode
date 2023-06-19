import * as vscode from "vscode";
import { Configuration, OpenAIApi } from "openai";
export function activate(context: vscode.ExtensionContext) {
  const leftPanelWebViewProvider = new GPT4WebView(context.extensionUri);
  let view = vscode.window.registerWebviewViewProvider(
    GPT4WebView.viewType,
    leftPanelWebViewProvider,
    { webviewOptions: { retainContextWhenHidden: true } }
  );
  context.subscriptions.push(view);
  context.subscriptions.push(
    vscode.commands.registerCommand("gpt4.search", () => {
      vscode.commands.executeCommand("workbench.view.extension.gpt4");
    })
  );
  //const provider=new GPT4WebView;
  //context.subscriptions.push(
  //  vscode.commands.registerCommand("gpt4.search", () => {
  //    provider.show(context.extensionUri);
  //  })
  //);
}

class GPT4WebView implements vscode.WebviewViewProvider {
  public static readonly viewType = "gpt4.view";
  private _apiKey="";
  private _view?: vscode.WebviewView;
  constructor(private readonly _extensionUri: vscode.Uri) {
    this._apiKey=vscode.workspace.getConfiguration('gpt4').get('apiKey')||"";    
    this._gptAuth();
  }

  private async _gptAuth() {
    this._apiKey=vscode.workspace.getConfiguration('gpt4').get('apiKey')||"";
    //const path = require("path");
    //require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
    if (this._apiKey === "") {
      await vscode.window
        .showErrorMessage("No API KEY Available", "Enter Manually")
        .then(async (selection) => {
          if (selection) {
            await this.getInputApi();
          }
        });
    }
    const configuration = new Configuration({
      apiKey: this._apiKey,
    });
    var req;
    try {
      const openaiApp = new OpenAIApi(configuration);
      req = await openaiApp.retrieveModel("gpt-3.5-turbo");
      console.log(req);
    } catch (error: any) {
      const status = error.message.slice(-3, error.message.length);
      if (status === "401") {
        await vscode.window
          .showErrorMessage(
            "ERROR: Incorrect API key provided",
            "Enter API Key again!"
          )
          .then(async (selection) => {
            if (selection) {
              await this.getInputApi();
            }
          });
      } else {
        vscode.window.showErrorMessage(
          "ERROR Occured while entering the api key"
        );
      }
    }
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    // set options for the webview, allow scripts
    this._view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };
    this._gptAuth();

    webviewView.webview.html = this._getHtmlForWebview(
      webviewView.webview,
      this._extensionUri
    );

    webviewView.webview.onDidReceiveMessage((data) => {
      switch (data.type) {
        case "sendQtn": {
          this.questionResponse(data);
        }
      }
    });
  }

  private async getInputApi() {
    const api = await vscode.window.showInputBox({
      placeHolder: "Enter OpenAI API KEY",
      prompt: "OpenAI API KEY",
    });
    if (api !== undefined) {
      vscode.workspace.getConfiguration('gpt4').update('apiKey',api,true);
      this._apiKey = api;
      this._gptAuth();
    }
  }

  private async questionResponse(data: any) {
    this._apiKey=vscode.workspace.getConfiguration('gpt4').get('apiKey')||"";
    console.log(data);
    const configuration = new Configuration({
      apiKey: this._apiKey,
    });
    const openaiApp = new OpenAIApi(configuration);
    this._view?.webview.postMessage({
      type: "addQuestion",
      value: data.value,
    });
    const selection = vscode.window.activeTextEditor?.selection;
    const selectedText =
      vscode.window.activeTextEditor?.document.getText(selection);
    const languageId = vscode.window.activeTextEditor?.document?.languageId
      ? vscode.window.activeTextEditor?.document?.languageId
      : undefined || "";
    let searchPrompt = "";

    if (selection && selectedText) {
      if (languageId) {
        searchPrompt = `${data.value}\n\`\`\`${languageId}\n${selectedText}\n\`\`\``;
      } else {
        searchPrompt = `${data.value}\n${selectedText}\n`;
      }
    } else {
      searchPrompt = data.value;
    }
    try {
      const request = await openaiApp.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [{ role: "system", content: searchPrompt }],
      });
      console.log(request.data.choices[0].message?.content);
      this._view?.webview.postMessage({
        type: "receiveAns",
        value: request.data.choices[0].message?.content,
      });
    } catch (error: any) {
      const status = error.message.slice(-3, error.message.length);
      if (status === "401") {
        this._view?.webview.postMessage({
          type: "receiveAns",
          value: "Incorrect API key provided : `Status 401`",
        });
        this._gptAuth();
      } else {
        if (status === "429") {
          this._view?.webview.postMessage({
            type: "receiveAns",
            value: "Rate limit reached for requests : `Status 429`",
          });
        } else {
          if (status === "503") {
            this._view?.webview.postMessage({
              type: "receiveAns",
              value:
                "The engine is currently overloaded, please try again later`",
            });
          } else {
            this._view?.webview.postMessage({
              type: "receiveAns",
              value: "ERROR Occured while processing the request",
            });
          }
        }
      }
    }
    this._view?.webview.postMessage({
      type: "enableBtn",
    });
  }

  private _getHtmlForWebview(
    webview: vscode.Webview,
    extensionUri: vscode.Uri
  ) {
    // Get resource paths
    const bootstapCss = webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, "media", "css", "bootstrap.css")
    );
    const mainCss = webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, "media", "css", "main.css")
    );
    const bootstrapJs = webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, "media", "scripts", "bootstrap.js")
    );
    const jqueryJs = webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, "media", "scripts", "jquery.js")
    );
    const popperJs = webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, "media", "scripts", "popper.js")
    );
    const mainJs = webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, "media", "scripts", "main.js")
    );
    const showDown = webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, "media", "scripts", "showdown.min.js")
    );
    return `
      <!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>GPT-4</title>

				<link href="${bootstapCss}" rel="stylesheet" />
        <link href="${mainCss}" rel="stylesheet" />
         <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
    integrity="sha512-iecdLmaskl7CVkqkXNQ/ZH/XLlvWZOJyj7Yy7tcenmpD1ypASozpmT/E0iPtmFIB46ZmdtAc9eNBvH0H/ZpiBw=="
    crossorigin="anonymous" referrerpolicy="no-referrer" />
        <script src="${bootstrapJs}" ></script>
			  <script src="${popperJs}"></script>
        <script src="${showDown}"></script>
        
			</head>
			<body style="background-color: #252525;">
      <div class="chat-container">
      <div class="chat-header d-flex">
      <div class="chat-title ">
        <span class="align-middle h4">ChatGPT</span>
      </div>
      <div>
        <button class="bg-dark text-light p-2" id="clearBtn">Clear Chat</button>
      </div>
    </div>

      <div id="response">
        <!-- Additional messages can be added dynamically -->
      </div>
      
      <div class="p-5 " style="background-color: #252525;">
  
      </div></div>
      <div class="chat-input fixed-bottom">
        <textarea rows="1" data-min-rows="1" class="autoExpand" autofocus placeholder="Type a message" id="input-prompt"></textarea>
        <button id="sendBtn" ><i class="fas fa-paper-plane"></i></button>
      </div> 
			<script src="${mainJs}" ></script>
      <script>
        textarea = document.querySelector(".autoExpand");
        textarea.addEventListener("input", autoResize, false);
        function autoResize() {
          this.style.height = "auto";
          this.style.height = this.scrollHeight + "px";
        }
      </script>
		</body>
	</html>`;
  }
}
