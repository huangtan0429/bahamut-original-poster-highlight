function replaceUrlParameter(url, paramName, paramValue) {

  const urlObj = new URL(url);
  const params = urlObj.searchParams;
  params.set(paramName, paramValue);
  params.delete('to'); // handle the tag function. Remove 'to' parameter if it exists
  params.delete('last'); // handle clinking from notification. Remove 'last' parameter if it exists
  return urlObj.toString();

}

async function getOriginalPosterID(targetURL) {
  try {
    const response = await fetch(targetURL);
    const htmlString = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    const originalPosterElement = doc.querySelector('.c-post__header__author');
    if (originalPosterElement) {
      if (originalPosterElement.querySelector('.floor.tippy-gpbp').getAttribute('data-floor') === '1') {
        return originalPosterElement.querySelector('.userid').textContent.trim();
      } else {
        // If the original poster is not on the first floor, return an empty string
        return '';
      }
    }
    return '';
  } catch (error) {
    console.error('Error fetching the page:', error);
    return '';
  }
}

async function highlightOriginalPoster() {

  // get the ID of the original poster
  const currentURL = document.URL.toString();
  const targetURL = replaceUrlParameter(currentURL, 'page', '1');
  const originalPosterID = await getOriginalPosterID(targetURL);

  const floorElements = document.querySelectorAll('.c-section__main.c-post');
  floorElements.forEach(floorElement => {
    // Prevent duplicate labels
    if (floorElement.querySelector('.round-label-floor')) return;

    // handle the floor
    const currentFloorID = floorElement.querySelector('.c-post__header__author .userid').textContent.trim().toLowerCase();
    let floor = floorElement.querySelector('.c-post__header__author .floor.tippy-gpbp').getAttribute('data-floor');

    if (currentFloorID === originalPosterID && floor !== "1") {
      floorElement.querySelector('.c-post__header__author .floor.tippy-gpbp').insertAdjacentHTML(
        'afterend',
        `<span class="round-label-floor">樓主</span>`
      );
    }

    // handle the comments
    const commentElements = floorElement.querySelectorAll('.reply-content');
    commentElements.forEach(commentElement => {
      // Prevent duplicate labels
      if (commentElement.querySelector('.round-label-comment')) return;

      const commentID = commentElement.querySelector('.reply-content__user').getAttribute('href').replace('//home.gamer.com.tw/', '');

      if (commentID === originalPosterID) {
        commentElement.insertAdjacentHTML(
          'afterbegin',
          `<span class="round-label-comment">樓主</span>`
        );
      } else if (commentID === currentFloorID) {
        commentElement.insertAdjacentHTML(
          'afterbegin', 
          `<span class="round-label-comment">${floor.toString()} 樓</span>`
        );
      }
    });
  });
}

// Initial run
highlightOriginalPoster();

// Observe DOM changes for unfolding comments
const observer = new MutationObserver(() => {
  highlightOriginalPoster();
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});