function formatDateToJapanese(dateInput) {
  const date = new Date(dateInput);

  const year = date.getFullYear();
  const month = date.getMonth() + 1; // getMonth() returns 0 for January, so add 1
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();

  const formattedDate = `${year}年${month}月${day}日 ${hours}時${minutes}分`;

  return {
    formattedDate: formattedDate,
    year: year,
    month: month,
    day: day,
    hours: hours,
    minutes: minutes
  };
}


async function getHeadlinesNHK(category, limit) {
  let headlinesUrl = "https://www3.nhk.or.jp/news/catnew.html";
  const headlinesUrls = {
    "社会": "https://www3.nhk.or.jp/news/cat01.html",
    "気象・災害": "https://www3.nhk.or.jp/news/saigai.html",
    "科学・文化": "https://www3.nhk.or.jp/news/cat03.html",
    "政治": "https://www3.nhk.or.jp/news/cat04.html",
    "ビジネス": "https://www3.nhk.or.jp/news/business.html",
    "国際": "https://www3.nhk.or.jp/news/cat06.html",
    "スポーツ": "https://www3.nhk.or.jp/news/cat07.html",
    "暮らし": "https://www3.nhk.or.jp/news/cat02.html"
  };
  if (headlinesUrls[category]) {
    headlinesUrl = headlinesUrls[category];
  };
  let listNum = 7;
  if (limit > 0) {
    listNum = limit;
  }
  try {
    const response = await fetch(headlinesUrl);
    if (response.ok) {
      let html = await response.text();
      html = minifyHTML(html)
      let parser = new DOMParser();
      let doc = parser.parseFromString(html, 'text/html');
      const timeJapan = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
      const timestamp = formatDateToJapanese(timeJapan).formattedDate
      const baseUrl = "https://www3.nhk.or.jp";
      const headlines = [];
      const listElement = doc.querySelector(".content--items ul")
      const listItems = listElement.querySelectorAll("li")
      let count = 0; // Counter to track iterations
      listItems.forEach((item) => {
        if (count >= listNum) return; // Exit after 10 iterations
        count++;
        const pathElement = item.querySelector("a");
        //const imgElement = item.querySelector("img");
        const titleElement = item.querySelector(".title");
        const timeElement = item.querySelector("time");
        const keywordElement = item.querySelector(".i-word");
    
        // Get data from elements
        const path = pathElement.getAttribute("href");
/*
        let thumb = "/news/parts16/images/common/noimg_default_s.gif";
        if (imgElement) {
          thumb = imgElement.getAttribute("data-src");
        }
*/
        const title = titleElement.textContent.trim();
        let date = timeElement ? timeElement.getAttribute("datetime") : "";
        const keyword = keywordElement ? keywordElement.textContent.trim() : "";
        //let recently = false;
        if (date !== "") {
/*
          const timeJapanObj = new Date(timeJapan);
          const publishedTime = new Date(date);
          const limitNew = new Date(publishedTime.getTime() + 30 * 60 * 1000);
          recently = timeJapanObj < limitNew;
*/
          date = formatDateToJapanese(date).formattedDate
        }
        headlines.push({ path, title, date, keyword });
      });
      // Build the result object
      const result = {
        timestamp,
        baseUrl,
        headlines,
      };
      return { news: result };
    } else {
      console.error('Failed to fetch HTML:', response.status);
      return { news: "Failed to get news headlines" };
    }
  } catch (error) {
    console.error('Error fetching HTML:', error);
    return { news: "Failed to get news headlines" };
  }
}



function stringJsObjToJson(input) {
  let result = input
    .replace(/(?<!\\)'(.*?)(?<!\\)'/g, (match, capturedContent) => {
      const processedContent = capturedContent.replace(/([\/,:])/g, "\\$1");
      return `'${processedContent}'`;
    })
    .replace(/[\t ]*\/\/.+\n/g, "")
    .replace(/(\w+?):/g, "\"$1\":")
    .replace(/(?<!\\),(?=\s*?[\}\]])/g, "")
    .replace(/(?<!\\)'(.*?)(?<!\\)'/g, (match, capturedContent) => {
      const processedContent = capturedContent.replace(/\\([\/,:])/g, "$1");
      return `"${processedContent}"`;
    });
  return JSON.parse(result)
}



async function getNewsDetailNHK(Url) {
  try {
    const response = await fetch(Url);
    if (response.ok) {
      const html = await response.text();
      let parser = new DOMParser();
      let doc = parser.parseFromString(html, 'text/html');
      let detailEle = doc.querySelector(".module--detail script")
      if (!detailEle) {
        return { newsDetail: Url };
      }
      let objString = detailEle.textContent.trim().replace(/^var __DetailProp__ = /, "").replace(/;$/,"")
      let jsonvar = stringJsObjToJson(objString)
      let newsDetail = { "baseUrl": "https://www3.nhk.or.jp/news/" }
      if (jsonvar.video && jsonvar.video !== "") {
        newsDetail.video = jsonvar.video.replace(/^\/news\//, "")
      } else if (jsonvar.img && jsonvar.img !== "") {
        newsDetail.img = jsonvar.img.replace(/^\/news\//, "")
      }
      if (jsonvar.caption && jsonvar.caption !== "") {
        newsDetail.caption = jsonvar.caption
      }
      if (jsonvar.title && jsonvar.title !== "") {
        newsDetail.title = jsonvar.title
      }
      if (jsonvar.summary && jsonvar.summary !== "") {
        newsDetail.summary = jsonvar.summary
      }
      if (jsonvar.more && jsonvar.more !== "") {
        newsDetail.more = jsonvar.more
      }
      if (jsonvar.body) {
        newsDetail.body = []
        for (let i = 0; i < jsonvar.body.length; i++) {
          let item = jsonvar.body[i];
          if (item.detailType == "1" && (item.linkurl == "" || !item.linkurl)) {
            let newItem = {};
            if (item.title && item.title !== "") {
              newItem.title = item.title;
            }
            if (item.video && item.video !== "") {
              newItem.video = item.video.replace(/^\/news\//, "");
            } else if (item.img && item.img !== "") {
              newItem.img = item.img.replace(/^\/news\//, "");
            }
            if (item.caption && item.caption !== "") {
              newItem.caption = item.caption;
            }
            if (item.text && item.text !== "") {
              newItem.text = item.text;
            }
            newsDetail.body.push(newItem);
          }
        }
      }
      return { newsDetail };
    } else {
      //console.error('Failed to fetch HTML:', response.status);
      return { news: "Failed to get news detail" };
    }
  } catch (error) {
    //console.error('Error fetching HTML:', error);
    return { news: "Failed to get news detail" };
  }
}