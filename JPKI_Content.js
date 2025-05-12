var extensionVersion = chrome.runtime.getManifest().version;

var url = location.href;

document.addEventListener("launchJPKIApp", (event) => {
  const request = JSON.parse(event.detail);
  handleCertRequest(request);
});

async function handleCertRequest(request) {
   const isSigningCert = request.keypair_division === "01";
   const certType = isSigningCert ? "Signing" : "Authentication";
 
   // Remove any existing dialog
   const existingDialog = document.getElementById("jpki-cert-dialog");
   if (existingDialog) {
     document.body.removeChild(existingDialog);
   }
 
   // Create dialog container
   const dialog = document.createElement("div");
   dialog.id = "jpki-cert-dialog";
   dialog.style.position = "fixed";
   dialog.style.top = "0";
   dialog.style.left = "0";
   dialog.style.width = "100%";
   dialog.style.height = "100%";
   dialog.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
   dialog.style.zIndex = "10000";
   dialog.style.display = "flex";
   dialog.style.justifyContent = "center";
   dialog.style.alignItems = "center";
   dialog.style.flexDirection = "column";
 
   // Create dialog content
   const content = document.createElement("div");
   content.style.backgroundColor = "white";
   content.style.borderRadius = "8px";
   content.style.padding = "20px";
   content.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.2)";
   content.style.width = "400px";
   content.style.maxWidth = "90%";
   content.style.textAlign = "center";
 
   // Title
   const title = document.createElement("h3");
   title.textContent = `Upload ${certType} Certificate`;
   title.style.margin = "0 0 16px 0";
   title.style.color = "#333";
   title.style.fontSize = "18px";
   content.appendChild(title);
 
   // Description
   const description = document.createElement("p");
   description.textContent = `Please select your ${certType.toLowerCase()} certificate file (.cer)`;
   description.style.margin = "0 0 20px 0";
   description.style.color = "#666";
   content.appendChild(description);
 
   // Create file input
   const input = document.createElement("input");
   input.type = "file";
   input.accept = ".cer";
   input.style.display = "block";
   input.style.margin = "0 auto 20px";
   
   // Cancel button
   const cancelBtn = document.createElement("button");
   cancelBtn.textContent = "Cancel";
   cancelBtn.style.padding = "8px 16px";
   cancelBtn.style.marginTop = "20px";
   cancelBtn.style.border = "none";
   cancelBtn.style.backgroundColor = "#ddd";
   cancelBtn.style.borderRadius = "4px";
   cancelBtn.style.cursor = "pointer";
   cancelBtn.onclick = () => {
     document.body.removeChild(dialog);
     sendErrorResponse({ message: "User cancelled" });
   };
   content.appendChild(input);
   content.appendChild(cancelBtn);
   
   dialog.appendChild(content);
   document.body.appendChild(dialog);
 
   input.onchange = async (e) => {
     const file = e.target.files[0];
     if (!file) return;
 
     try {
       const certData = await processCertificate(file, isSigningCert);
       document.body.removeChild(dialog);
       sendCertResponse(certData, isSigningCert);
     } catch (error) {
       document.body.removeChild(dialog);
       sendErrorResponse(error);
     }
   };
 }
 
/**
 *
 * @param {File} file
 * @param {boolean} isSigning
 * @returns
 */
async function processCertificate(file, isSigning) {
  // Read and convert certificate
  const buffer = await file.arrayBuffer();
  const derBytes = new Uint8Array(buffer);

  // Convert to Base64 without headers
  const base64Cert = btoa(String.fromCharCode(...derBytes));

  return {
    result: "0",
    certificate: base64Cert,
    errcode: "",
  };
}

function sendCertResponse(data, isSigning) {
  const responseEvent = new CustomEvent("recvJPKIMsg", {
    detail: JSON.stringify(data),
  });

  // Dispatch to appropriate handler
  if (isSigning) {
    document.dispatchEvent(responseEvent);
    // Auto-trigger user cert flow after signing cert
    setTimeout(
      () =>
        handleCertRequest({
          mode: "11",
          keypair_division: "02",
          certificate_type: "01",
        }),
      100
    );
  } else {
    document.dispatchEvent(responseEvent);
  }
}

function sendErrorResponse(error) {
  console.error("Certificate Error:", error);
  const errorEvent = new CustomEvent("recvJPKIMsg", {
    detail: JSON.stringify({
      result: "1",
      certificate: "",
      errcode: "FILE_READ_ERROR",
    }),
  });
  document.dispatchEvent(errorEvent);
}

window.addEventListener(
  "beforeunload",
  (event) => {
    chrome.runtime.sendMessage({ type: "close", message: "05" }, (res) => {});
  },
  false
);
