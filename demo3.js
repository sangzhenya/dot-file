/*

[rewrite_local]

^https?:\/\/.*\.example\.com url script-analyze-echo-response https://raw.githubusercontent.com/sangzhenya/dot-file/main/demo3.js

[mitm]

hostname = *.example.com

*/

let url = $request.url;
let body = $request.body
let accessToken = $prefs.valueForKey("pikpak_ck");
console.log("url1:" + url)
console.log("body1:" + body)
console.log("accessToken:" + accessToken)
const method = "POST";
let headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36",
    "Content-Type": "application/json"
  };
let myResponse = {
    status: "HTTP/1.1 200 OK"
  };
let obj = {};

function hex2str(hex) {
	var trimedStr = hex.trim();
	var rawStr = trimedStr.substr(0, 2).toLowerCase() === "0x" ? trimedStr.substr(2) : trimedStr;
	var len = rawStr.length;
	if (len % 2 !== 0) {
		return "";
	}
	var curCharCode;
	var resultStr = [];
	for (var i = 0; i < len; i = i + 2) {
		curCharCode = parseInt(rawStr.substr(i, 2), 16);
		resultStr.push(String.fromCharCode(curCharCode));
	}
	return resultStr.join("");
}


async function AliyunAuth() {
  return new Promise(e => {
    let username = decodeURIComponent(body.match(/account=([^&]+)/)[1]);
    let password = decodeURIComponent(body.match(/passwd=([^&]+)/)[1]);

    console.log(`username: ${username}`)
    console.log(`password: ${password}`)
    let s = {
      url: "https://user.mypikpak.com/v1/auth/signin",
      method: method,
      headers: headers,
      body: JSON.stringify({
        client_id: 'YNxT9w7GMdWvEOKa',
        username: username,
        password: password,
      })
    };
    $task.fetch(s).then(t => {
      try {
        console.log("AliyunAuth:" + JSON.stringify(t))
        let a = JSON.parse(t.body);
        a.access_token ? ($prefs.setValueForKey(a.access_token, "pikpak_ck"), obj = {
          success: !0,
          data: {
            sid: a.access_token
          }
        }, myResponse.body = JSON.stringify(obj), $done(myResponse)) : $done()
      } finally {
        e()
      }
    }, e => {
      $done()
    })
  })
}

async function AliyunEntry() {
  return new Promise(e => {
    let t = $request.body;
    if ("string" == typeof t) {
      if (-1 != t.indexOf("list_share") || -1 != t.indexOf("method=list")) {
        headers.authorization = "Bearer " + accessToken;

        let req = {
          url: `https://api-drive.mypikpak.com/drive/v1/files?filters=%7B%22phase%22%3A%7B%22eq%22%3A%22PHASE_TYPE_COMPLETE%22%7D%2C%22trashed%22%3A%7B%22eq%22%3Afalse%7D%7D&parent_id=&thumbnail_size=SIZE_LARGE`,
          method: "GET",
          headers: headers
        }
        let path = body.match(/folder_path=([^&]*)/) ? "root" : t.match(/folder_path=([^&]*)/);
				let a = path ? ((req.url = req.url.replace(/(parent_id=)/, `$1${path}`)), "files") : "shares";
        console.log(JSON.stringify(req))
        $task.fetch(req).then(t => {
          try {
            console.log("AliyunEntry:" + JSON.stringify(t))
            let items = JSON.parse(t.body).files;
            let shares = JSON.stringify(
              items.map((item) => {
                return {
                  isdir: !item.file_extension,
                  path: item.id,
                  name: item.name,
                  additional: { size: parseInt(item.size) },
                };
              }),
            );

            $done({
              response: { status: 200, body: `{"success":true,"data":{"total":0,"offset":0,"${a}":${shares}}}` },
            });
          } finally {
            e()
          }
        }, e => {
          $done()
        })
      }
    } else $done()
  })
}
async function AliyunDownLoad() {
  return new Promise(e => {
    let fids = url.match("fbdownload") ? hex2str(url.match(/dlink=%22(.*)%22/)[1]) : url.match(/path=(.*$)/)[1];
    headers.authorization = "Bearer " + accessToken;
    let s = {
      url: `https://api-drive.mypikpak.com/drive/v1/files/${fids}?&thumbnail_size=SIZE_LARGE`,
      method: "GET",
      headers: headers
    };
    $task.fetch(s).then(t => {
      try {
        console.log("AliyunDownLoad:" + JSON.stringify(t))
        let link = JSON.parse(t.body).links["application\/octet-stream"].url.replace(/https/, "http");
        $done({
          status: "HTTP/1.1 302 Found",
          headers: {
            Location: link
          }
        })
      } finally {
        e()
      }
    }, e => {
      $done()
    })
  })
}

function hexToUtf8(e) {
  return decodeURIComponent("%" + e.match(/.{1,2}/g).join("%"))
}(async () => {
  /pikpak.*?\/webapi\/auth\.cgi/.test($request.url) ? await AliyunAuth() : /pikpak.*?webapi\/entry\.cgi/.test($request.url) ? await AliyunEntry() : /pikpak.*?fbdownload/.test($request.url) ? await AliyunDownLoad() : /alist.*?\/webapi\/auth\.cgi/.test($request.url) ? await AlistAuth() : /alist.*?webapi\/entry\.cgi/.test($request.url) ? await AlistEntry() : /alist.*?fbdownload/.test($request.url) && await AlistDownLoad()
})();

