async function getHeadlinesNHK() {
  try {
    const response = await fetch('https://www3.nhk.or.jp/news/catnew.html');
    if (response.ok) {
      let html = await response.text();
      html = minifyHTML(html)
      let parser = new DOMParser();
      let doc = parser.parseFromString(html, 'text/html');
      
      const baseUrl = "https://www3.nhk.or.jp";
      const headlines = [];
      const listItems = doc.querySelectorAll("ul li")
      listItems.forEach((item) => {
        const pathElement = item.querySelector("a");
        const imgElement = item.querySelector("img");
        const titleElement = item.querySelector(".title");
        const timeElement = item.querySelector("time");
        const keywordElement = item.querySelector(".i-word");
    
        // Get data from elements
        const path = pathElement.getAttribute("href");
        let thumb = "/news/parts16/images/common/noimg_default_s.gif";
        if (imgElement) {
          thumb = imgElement.getAttribute("data-src");
        }
        const title = titleElement.textContent.trim();
        const date = timeElement ? timeElement.getAttribute("datetime") : "";
        const keyword = keywordElement ? keywordElement.textContent.trim() : "";
        let isNew = false;
        if (date !== "") {
          const timeJapan = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
          const timeJapanObj = new Date(timeJapan);
          const publishedTime = new Date(date);
          const limitNew = new Date(publishedTime.getTime() + 30 * 60 * 1000);
          isNew = timeJapanObj < limitNew;
        }
        headlines.push({ path, thumb, title, date, isNew, keyword });
      });
      // Build the result object
      const result = {
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
