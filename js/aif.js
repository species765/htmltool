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


async function getHeadlinesNHK() {
  try {
    const response = await fetch('https://www3.nhk.or.jp/news/catnew.html');
    if (response.ok) {
      let html = await response.text();
      html = minifyHTML(html)
      let parser = new DOMParser();
      let doc = parser.parseFromString(html, 'text/html');
      const timeJapan = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
      const timestamp = formatDateToJapanese(timeJapan).formattedDate
      const baseUrl = "https://www3.nhk.or.jp";
      const headlines = [];
      const listItems = doc.querySelectorAll("ul li")
      let count = 0; // Counter to track iterations
      listItems.forEach((item) => {
        if (count >= 10) return; // Exit after 10 iterations
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
          //thumb = imgElement.getAttribute("data-src");
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
        timestamp
        baseUrl,
        headlines,
      };
      return { news: result };
    } else {
      return { news: "Failed to get news headlines" };
      console.error('Failed to fetch HTML:', response.status);
    }
  } catch (error) {
    return { news: "Failed to get news headlines" };
    console.error('Error fetching HTML:', error);
  }
}
