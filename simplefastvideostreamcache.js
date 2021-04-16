const urlParse = require("url");
const fs = require("fs");
const path = require("path");
const Lru = require("./lrucache").Lru;
const stream = require('stream').Readable;
function generateVideoCache(chunkSize,numCachedChunks,chunkExpireSeconds, perfCountObj)
{
	perfCountObj.videoCacheMiss=0;
	perfCountObj.videoCacheHit=0;
	let videoCache={chunkSize:chunkSize};
	videoCache.cache= new Lru(numCachedChunks, function(key,callbackPrm){
						perfCountObj.videoCacheMiss++;
						let callback = callbackPrm;
						
						let data=[];
						let keyArr = key.split("##@@##");
						let url2 = keyArr[0];
						let startByte = parseInt(keyArr[1],10);
						let stopByte = startByte+videoCache.chunkSize;

						fs.stat(path.join(__dirname,url2),async function(err,stat){
							if(err)
							{
								callback({data:[], maxSize:-1, startByte:-1, stopByte:-1});
								return;
							}
							
							if(stopByte > stat.size)
							{
								stopByte = parseInt(stat.size,10);
							}

							if(startByte >= stopByte)
							{
								callback({data:[], maxSize:-1, startByte:-1, stopByte:-1});
								return;
							}
							
															
							let readStream=fs.createReadStream(path.join(__dirname,url2),{start:startByte, end:stopByte});
							readStream.on("readable",function(){
								let dataChunk =""; 
								while(data.length<(stopByte-startByte))
								{
									let dataChunk = readStream.read((stopByte-startByte) - data.length);
									if(dataChunk !== null)
									{
										data.push(dataChunk);
									}
									else
									{
										break;
									}
								}

							});
							readStream.on("error",function(err){ 
								callback({data:[], maxSize:-1, startByte:-1, stopByte:-1});
								return; 
							});
							readStream.on("end",function(){  
								callback({data:Buffer.concat(data), maxSize:stat.size, startByte:startByte, stopByte:stopByte});
							});	
						});			
	},chunkExpireSeconds*1000);

	videoCache.get = function(filePath, offsetByte,callback){
		filePath = decodeURI(urlParse.parse(filePath).pathname);
		let rangeStart = offsetByte;
		let rangeStop = videoCache.chunkSize; 
		if(rangeStart)
		{

		}
		else
		{
			rangeStart=0;
		}

		if(rangeStop)
		{

		}
		else
		{
			rangeStop = rangeStart + videoCache.chunkSize;
		}
							
		let dataVideo = [];
		let cacheStart = rangeStart - (rangeStart%videoCache.chunkSize);
		videoCache.cache.get(filePath+"##@@##"+cacheStart,function(video){
			perfCountObj.videoCacheHit++;
			if(video.startByte>=0)
			{
				let offs = rangeStart%videoCache.chunkSize;
				let remain = videoCache.chunkSize - offs;
				if(remain>video.maxSize)
					remain = video.maxSize;
				if(remain>video.data.length)
					remain=video.data.length;
				let vidChunk = video.data.slice(offs,offs+remain);
				if(remain>vidChunk.length)
					remain=vidChunk.length;
				let result={ data:vidChunk, offs:rangeStart, remain:remain, maxSize:video.maxSize};
				callback(result);
				return;
			}
			else
			{
				callback(false);
				return;
			}								
		});
	};
	videoCache.stream = function(req,res,vidType){
		let url2 = decodeURI(urlParse.parse(req.url).pathname);
		let rangeStart = 0;
		let rangeStop = videoCache.chunkSize; 
		if(req.headers.range)
		{
			let spRange = req.headers.range.split("=");
			if(spRange.length>1)
			{
				let spRange2 = spRange[1].split("-");
				if(spRange2.length>1)
				{
					rangeStart = parseInt(spRange2[0],10);
					rangeStop = parseInt(spRange2[1],10);
				}
				else if(spRange2.length==1)
				{
					rangeStart = parseInt(spRange2[0],10);
					rangeStop = rangeStart + videoCache.chunkSize;
				}
			}
					
		}
													
		if(rangeStart)
		{

		}
		else
		{
			rangeStart=0;
		}

		if(rangeStop)
		{

		}
		else
		{
			rangeStop = rangeStart + videoCache.chunkSize;
		}
							
		let dataVideo = [];
		let cacheStart = rangeStart - (rangeStart%videoCache.chunkSize);
		/* {data:[], maxSize:stat.size, startByte:-1, stopByte:-1} */
							
		videoCache.cache.get(url2+"##@@##"+cacheStart,function(video){
			if(video.startByte>=0)
			{
				let offs = rangeStart%videoCache.chunkSize;
				let remain = videoCache.chunkSize - offs;
				if(remain>video.maxSize)
					remain = video.maxSize;
				if(remain>video.data.length)
					remain=video.data.length;
				let vidChunk = video.data.slice(offs,offs+remain);
				if(remain>vidChunk.length)
					remain=vidChunk.length;
							
				res.writeHead(206,{
					"Content-Range": "bytes " + rangeStart + "-" + (rangeStart+remain-1) + "/" + video.maxSize,
					"Accept-Ranges": "bytes",
					"Content-Length": remain,
					"Content-Type": (vidType[0])
				});
										

				perfCountObj.videoCacheHit++;
				stream.from(vidChunk).pipe(res);
				return;
			}
			else
			{
				res.writeHead(404);
				perfCountObj.videoCacheHit++;									
				res.end("404: "+vidType[1]+" video file not found.");
				return;
			}								
		});
	}
	return videoCache;
}

const videoTypes = {	
	"mp4":["video/mp4",".mp4"], 
	"ogg":["video/ogg",".ogg"], 
	"ogv":["video/ogv",".ogv"],
	"webm":["video/webm",".webm"]
};

function getVidType(url)
{
	let vidType = ["",""];
	let urlType = url.split(".");
	urlType = urlType[urlType.length-1];
	if(urlType in videoTypes)
	{
		vidType = videoTypes[urlType];
	}
	return vidType;
}

exports.videoTypes = videoTypes;
exports.generateVideoCache = generateVideoCache;
exports.getVidType = getVidType;
