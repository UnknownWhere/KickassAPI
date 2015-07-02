var API_URL_SMALL = "http://kickass.to/hourlydump.txt.gz";
var API_URL = "http://kickass.to/dailydump.txt.gz";
var TRAKT_API_URL = "https://api-v2launch.trakt.tv";


var EPISODE_INFO = [  
  /^(.+)[\t\s]*s(\d\d)\s?e(\d\d)/i,
  /^(.+)[\s\t]*(\d+)x(\d+)/i
];
var QUALITY_INFO = /(420p|720p|1080p|HDTV)/i;
var WHITELIST_UPLODER = [
 "ettv","eztv"
]
var BLACKLIST = [
  /X264/i,
  /XviD/i,
  /AAC/i,
  /MKV/i
];
// /HDTV/i,

var request = require('request'),
    zlib = require('zlib'),
    byline = require('byline');
var Trakt = require('trakt-api');

var tracktOptions = {};
var trakt = Trakt("bd1f2f72a4cdb58d66a267f89f0ebe1ed193c2f9aa7b1fece444e69f6cac70bb", [tracktOptions]);
    
var stream = byline.createStream();
request(API_URL, {encoding: null}).pipe(zlib.createGunzip()).pipe(stream);

var totalEntries = 0,
    traktEntries = 0;
stream.on('data', function(line) {
  var whiteList  = false;
  for(var i in WHITELIST_UPLODER) {
    if(line.toString().indexOf(WHITELIST_UPLODER[i])>-1){
      whiteList = true;
      break;
    }
  }

  if(!whiteList) return;
  var data = parseLine(line.toString());

  if(data.category != 'TV') return;

  totalEntries++;

  trakt.searchShow(data.title).then(function(shows) {
    var show = shows[0];
    trakt.show(show.ids.trakt, { extended : 'full,images,metadata' , limit : 1 }).then(function(show) {
      console.log(show);
}).catch(function(err) {
});
}).catch(function(err) {
});
  // request(TRAKT_API_URL, {
  //   qs: {
  //     query: data.title,
  //     limit: 2
  //   },
  //   json: true
  // }, function(err, res, json) {
  //   if(!err && json && json.length) {
  //       var traktData =  json[0];
  //       console.log(JSON.stringify(traktData));
  //       traktEntries++;
  //       console.log(
  //         '[%s] %s {%s} (Season %s / Episode %s) | ' +
  //         'Trakt.tv: %s (%s)', 
  //         data.hash.slice(0,5), 
  //         data.title ? data.title : data.filename, 
  //         data.quality,
  //         data.season, 
  //         data.episode, 
  //         traktData.title,
  //         traktData.url
  //       );
  //   } else if(err){
  //     console.log(err);
  //   }
  // });
});

stream.on('end', function() {
  console.log('Found %d shows on Trakt.tv out of %d', totalEntries, traktEntries);
})

function parseLine(line) {
  var params = line.split('|'), title, season, episode, quality;
  params[1] = params[1].replace(/\./g, ' ').trim();
  
  // Filter our any words we don't need
  for(var i in BLACKLIST) {
    params[1] = params[1].replace(BLACKLIST[i], '').trim();
  }

  if(QUALITY_INFO.test(params[1])) {
    quality = QUALITY_INFO.exec(params[1])[1];
    params[1] = params[1].replace(QUALITY_INFO, '').trim();
  }
  
  for(var i in EPISODE_INFO) {
    var reg = EPISODE_INFO[i];
    if(reg.test(params[1])) {
      var matches = reg.exec(params[1]);
      title = matches[1].trim();
      season = matches[2];
      episode = matches[3];
      break;
    }
  }
  return {
    hash: params[0],
    filename: params[1],
    category: params[2],
    link: params[3],
    torrent: params[4],
    title: title ? title : '',
    season: season ? season : 0,
    episode: episode ? episode : 0,
    quality: quality ? quality : ''
  };
}