'use strict';

const cache = require("./simplefastvideostreamcache.js").generateVideoCache; 
const getVidType = require("./simplefastvideostreamcache.js").getVidType;
const videoTypes = require("./simplefastvideostreamcache.js").videoTypes;
const chunkSize = 1024*64; // it was 1M
const numCachedChunks = 300;
const chunkExpireSeconds = 100;
const perfCountObj={};

// setInterval(function(){console.log(perfCountObj);},1000);

const video = cache(chunkSize,numCachedChunks,chunkExpireSeconds, perfCountObj)

const http = require('http'); 
const options = {};
options.agent = new http.Agent({ keepAlive: true });

const server = http.createServer(options,async (req, res) => {  

    if(req.url==="" || req.url==="/")
    {   
        res.writeHead(200);
        res.end(JSON.stringify(perfCountObj));
    }
    else
    {
        let vidType = getVidType(req.url);
        video.stream(req,res,vidType);
    }
});

server.listen( process.env.PORT || 8000, "0.0.0.0", () => {
  console.log("Server running");
});
