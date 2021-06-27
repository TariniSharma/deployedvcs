path = require("path");
express = require("express");
const app = express();

let port = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "/public")));

app.get("/", (req,res) => {
    options = {root: path.join(__dirname, "./public")};
    //console.log(options);
    res.sendFile("webpage.html",options);
});

app.listen(port, () => {
    console.log("listenin man");
});