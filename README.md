# SimpleFastVideoStreamCache
Simple (2 files), fast (1.8GB/s by 1 core of fx8150), video (mp4,ogg,..), stream cache (LRU implementation) for NodeJS http requests.

Example:

```cpp

const cache = require("./simplefastvideostreamcache.js").generateVideoCache; 
const chunkSize = 1024*1024;
const numCachedChunks = 100;
const chunkExpireSeconds = 100;
const perfCountObj={};
setInterval(function(){console.log(perfCountObj);},1000);

const video = new cache(chunkSize,numCachedChunks,chunkExpireSeconds, perfCountObj)

const http = require('http'); 
const options = {};
options.agent = new http.Agent({ keepAlive: true });

const server = http.createServer(options,async (req, res) => {					
	video.stream(req,res);
});

server.listen(8000, "0.0.0.0", () => {
  console.log("Server running");
});
  
```
