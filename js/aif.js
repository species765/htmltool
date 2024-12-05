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
  const baseUrl = "https://www3.nhk.or.jp/news/";
  const headlinesUrls = {
    "主要": "json16/syuyo.json",
    "新着": "json16/new_001.json",
    "社会": "json16/cat01_001.json",
    "気象・災害": "json16/cat08_001.json",
    "科学・文化": "json16/cat03_001.json",
    "政治": "json16/cat04_001.json",
    "ビジネス": "json16/cat05_001.json",
    "国際": "json16/cat06_001.json",
    "スポーツ": "json16/cat07_001.json",
    "暮らし": "json16/cat02_001.json",
    "地域": "json16/cat09_001.json"
  };

  const selectedUrl = headlinesUrls[category] || headlinesUrls["主要"];
  const headlines = [];
  let currentUrl = selectedUrl;
  let fetchedCount = 0;

  try {
    while (fetchedCount < limit) {
      const response = await fetch(baseUrl + currentUrl);
      if (!response.ok) {
        console.error(`Failed to fetch JSON: ${response.status}`);
        return { news: "Failed to get news headlines" };
      }

      const data = await response.json();
      if (!data.channel || !data.channel.item) {
        console.error("Invalid JSON structure");
        return { news: "Invalid JSON structure" };
      }

      const items = data.channel.item;
      for (const item of items) {
        if (fetchedCount >= limit) break;
        headlines.push({
          link: item.link,
          title: item.title,
          date: item.pubDate ? formatDateToJapanese(item.pubDate).formattedDate : "",
          keywords: item.word ? item.word.length > 0 ? item.word[0].title : "" : "",
        });
        fetchedCount++;
      }

      if (!data.channel.hasNext || fetchedCount >= limit) break;

      // Update the URL for the next page
      const nextPageNumber = currentUrl.match(/_(\d+)\.json$/)
        ? parseInt(currentUrl.match(/_(\d+)\.json$/)[1], 10) + 1
        : 2;

      currentUrl = currentUrl.replace(/_\d+\.json$/, `_${String(nextPageNumber).padStart(3, '0')}.json`);
    }

    const timeJapan = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
    const timestamp = formatDateToJapanese(timeJapan).formattedDate
    return {
      news: { timestamp, baseUrl, headlines },
    };
  } catch (error) {
    console.error("Error fetching JSON:", error);
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