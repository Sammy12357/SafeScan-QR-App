const fs = require("fs");
const path = require("path");

const indexTarget = path.join(__dirname, "..", "node_modules", "@expo", "ngrok", "index.js");
const clientTarget = path.join(__dirname, "..", "node_modules", "@expo", "ngrok", "src", "client.js");

if (!fs.existsSync(indexTarget) || !fs.existsSync(clientTarget)) {
  process.exit(0);
}

const source = fs.readFileSync(indexTarget, "utf8");
const needle = "processUrl = await getProcess(opts);\n  ngrokClient = new NgrokClient(processUrl);";
const replacement =
  "processUrl = await getProcess(opts);\n" +
  "  // ngrok can print its local API address before that API accepts requests.\n" +
  "  // Give it a short breath so Expo tunnel startup does not crash with\n" +
  "  // `Cannot read properties of undefined (reading 'body')`.\n" +
  "  await new Promise((resolve) => setTimeout(resolve, 1000));\n" +
  "  ngrokClient = new NgrokClient(processUrl);";

if (!source.includes(replacement) && !source.includes(needle)) {
  console.warn("Could not patch @expo/ngrok; expected startup code was not found.");
  process.exit(0);
}

if (!source.includes(replacement)) {
  fs.writeFileSync(indexTarget, source.replace(needle, replacement));
}

const clientSource = fs.readFileSync(clientTarget, "utf8");
const clientNeedle = "    } catch (error) {\n      let clientError;";
const clientReplacement =
  "    } catch (error) {\n" +
  "      if (!error.response) {\n" +
  "        throw new NgrokClientError(\n" +
  "          error.message || \"ngrok local API is not ready yet\",\n" +
  "          { statusCode: 503 },\n" +
  "          {\n" +
  "            msg: error.message || \"ngrok local API is not ready yet\",\n" +
  "            details: { err: \"a successful ngrok tunnel session has not yet been established\" },\n" +
  "          }\n" +
  "        );\n" +
  "      }\n" +
  "      let clientError;";

if (!clientSource.includes("ngrok local API is not ready yet")) {
  if (!clientSource.includes(clientNeedle)) {
    console.warn("Could not patch @expo/ngrok client; expected request code was not found.");
    process.exit(0);
  }
  fs.writeFileSync(clientTarget, clientSource.replace(clientNeedle, clientReplacement));
}
