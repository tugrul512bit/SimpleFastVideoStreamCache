# SimpleFastVideoStreamCache
Simple (2 files), fast (1.8GB/s by 1 core of fx8150), video (mp4,ogg,..), stream cache (LRU-CLOCK async cache eviction optimization) for NodeJS http requests.

Simple approach:

```cpp

const cache = require("./simplefastvideostreamcache.js").generateVideoCache; 
const chunkSize = 1024*1024; // size (in bytes) of each video stream chunk
const numCachedChunks = 100; // total chunks cached (shared for all video files accessed)
const chunkExpireSeconds = 100; // when a chunk not accessed for 100 seconds, it is marked as removable
const perfCountObj={}; // just to see performance of cache (total hits and misses where each miss resolves into a hit later so hits = miss + cache hit)
setInterval(function(){console.log(perfCountObj);},1000);

const video = cache(chunkSize,numCachedChunks,chunkExpireSeconds, perfCountObj)

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

Customizable approach:

```cpp

const cache = require("./simplefastvideostreamcache.js").generateVideoCache; 
const chunkSize = 1024*1024; // size (in bytes) of each video stream chunk
const numCachedChunks = 100; // total chunks cached (shared for all video files accessed)
const chunkExpireSeconds = 100; // when a chunk not accessed for 100 seconds, it is marked as removable
const perfCountObj={}; // just to see performance of cache (total hits and misses where each miss resolves into a hit later so hits = miss + cache hit)
setInterval(function(){console.log(perfCountObj);},1000);

const video = cache(chunkSize,numCachedChunks,chunkExpireSeconds, perfCountObj)

const http = require('http'); 
const options = {};
options.agent = new http.Agent({ keepAlive: true });

const server = http.createServer(options,async (req, res) => {					

	let startByte=0;
	if(req.headers.range)
	{
		if(req.headers.range.split("=")[1])
		{
			startByte = req.headers.range.split("=")[1].split("-")[0];
			startByte = parseInt(startByte,10);
		}
	} 

	video.get(req.url,startByte,function(vid){
		if(vid)
		{	
			res.writeHead(206,{
				"Content-Range": "bytes " + vid.offs + "-" + (vid.offs+vid.remain-1) + "/" + vid.maxSize,
				"Accept-Ranges": "bytes",
				"Content-Length": vid.remain,
				"Content-Type": ("video/"+(req.url.indexOf(".mp4")!== -1 ? "mp4" : "ogg"))
			});
			res.end(vid.data);
		}
		else
		{
			// some error
		}
	});
});

server.listen(8000, "0.0.0.0", () => {
  console.log("Server running");
});
  
```

Benchmark (app folder contains some_video.mp4):

```
ab -k -n 40000 -c 500 "http://127.0.0.1:8000/some_video.mp4"

This is ApacheBench, Version 2.3 <$Revision: 1807734 $>
Copyright 1996 Adam Twiss, Zeus Technology Ltd, http://www.zeustech.net/
Licensed to The Apache Software Foundation, http://www.apache.org/

Benchmarking 127.0.0.1 (be patient)
Completed 4000 requests
Completed 8000 requests
Completed 12000 requests
Completed 16000 requests
Completed 20000 requests
Completed 24000 requests
Completed 28000 requests
Completed 32000 requests
Completed 36000 requests
Completed 40000 requests
Finished 40000 requests


Server Software:        
Server Hostname:        127.0.0.1
Server Port:            8000

Document Path:          /some_video.mp4
Document Length:        1048576 bytes

Concurrency Level:      500
Time taken for tests:   22.597 seconds
Complete requests:      40000
Failed requests:        0
Keep-Alive requests:    40000
Total transferred:      41952200000 bytes
HTML transferred:       41943040000 bytes
Requests per second:    1770.12 [#/sec] (mean)
Time per request:       282.467 [ms] (mean)
Time per request:       0.565 [ms] (mean, across all concurrent requests)
Transfer rate:          1812994.49 [Kbytes/sec] received

Connection Times (ms)
              min  mean[+/-sd] median   max
Connect:        0    0   1.4      0      19
Processing:    59  277  28.3    272     746
Waiting:       58  275  26.8    271     649
Total:         68  277  28.1    272     746

Percentage of the requests served within a certain time (ms)
  50%    272
  66%    275
  75%    278
  80%    279
  90%    292
  95%    313
  98%    337
  99%    367
 100%    746 (longest request)


```

How it works:

- clients can click any arbitrary time point of video in browser and browser can request any arbitrary blob offset
- the cache only remembers fixed ranges of blobs which are broadcasted to all asynchronous requests but with Buffer.slice() method to take only the necessary part of blob. This makes this cache memory efficient compared to arbitrary ranged blob caching. 

For example, user clicks "second 5", browser requests 150000 offset. It comes from cached blob #1234. When user clicks "second 5.5", browser requests ~165000 offset and it comes from same cached blob with just a bit less buffer length instead of polluting cache with different range.

- the clock-lru cache eviction algorithm supports N(number of cache blobs / cache size) in-flight cache-misses (file streams from HDD to cache) and overlappable with asynchronous cache-hits (streaming from cache-RAM to client)
- Dependencies are "fs", "path", "url" and "stream". These are core modules of NodeJS.
