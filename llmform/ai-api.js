var OPENAI_API_KEY = "";
async function fetchGptResponse(gptSendText) {
  OPENAI_API_KEY = document.getElementById("apiKey").value;
    return new Promise((resolve, reject) => {
      var oHttp = new XMLHttpRequest();
      oHttp.open("POST", "https://api.openai.com/v1/completions");
      //https://api.openai.com/v1/chat/completions   (for newer versions)
      oHttp.setRequestHeader("Accept", "application/json");
      oHttp.setRequestHeader("Content-Type", "application/json");
      oHttp.setRequestHeader("OPENAI_API_KEY", OPENAI_API_KEY);
      oHttp.setRequestHeader("Authorization", "Bearer " + OPENAI_API_KEY);
  
      oHttp.onreadystatechange = function () {
        if (oHttp.readyState === 4) {
          var oJson = {};
  
          try {
            oJson = JSON.parse(oHttp.responseText);
          } catch (ex) {
            document.getElementById("llm-output").value = "Error: " + ex.message;
            reject(ex);
          }
  
          if (oJson.error && oJson.error.message) {
            document.getElementById("llm-output").value = "Error: " + oJson.error.message;
          } else if (oJson.choices && oJson.choices[0].text) {
            var gptResponse = oJson.choices[0].text;
  
            if (gptResponse === "") gptResponse = "No response";
            else if (gptResponse === null) gptResponse = "Null";
            
            resolve(gptResponse);
          }
        }
      };
  
      var data = {
        model: "text-davinci-003",
        max_tokens: 2048,
        prompt: gptSendText,
        //messages: [{"role": "user", "content": gptSendText}],
      };
  
      try {
        oHttp.send(JSON.stringify(data));
      } catch (error) {
        console.error("An error occurred while sending the request:", error);
        return "An error occurred while sending the request: " + error;
      }	
   
      
    });
  }


  isWorking = false;
  async function Send() {
    if (isWorking === true) {
      alert("The system is still processing. Refresh the page if you think it's taking too long.");
      return;
    }
    isWorking = true;
    
    let sourceText = document.getElementById("output").value;
    
    if (sourceText === "") {
      alert("Type in your question!");
      
      isWorking = false;
      return;
    }
    document.getElementById("llm-output").value ="Processing..."
    try {
      let gptResponse = await fetchGptResponse(sourceText);
      console.log(gptResponse);      
      document.getElementById("llm-output").value = `\n\n${gptResponse}`;
	  applyAutoResizeToAllRelevantTextareas();
    } catch (error) {
        console.log(error);
      document.getElementById("llm-output").value += `\n\nError: ${error}`;
    }
  
    isWorking = false;
  }
  