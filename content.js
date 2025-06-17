function replaceUrlParameter(url, paramName, paramValue) {

  const urlObj = new URL(url);
  const params = urlObj.searchParams;
  params.set(paramName, paramValue);
  params.delete('to'); // handle the tag function. Remove 'to' parameter if it exists
  params.delete('last'); // handle clinking from notification. Remove 'last' parameter if it exists
  return urlObj.toString();

}

let originalPosterIDCache = null;
let originalPosterIDCacheURL = null;

async function getOriginalPosterID(targetURL) {
  // Only fetch if URL contains "C.php"
  if (!targetURL.includes('C.php')) {
    return '';
  }
  // Use cache if available and URL hasn't changed
  if (originalPosterIDCache !== null && originalPosterIDCacheURL === targetURL) {
    return originalPosterIDCache;
  }
  try {
    const response = await fetch(targetURL);
    const htmlString = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    doc.querySelectorAll('img').forEach(img => img.remove());
    const originalPosterElement = doc.querySelector('.c-post__header__author');
    if (originalPosterElement) {
      if (originalPosterElement.querySelector('.floor.tippy-gpbp').getAttribute('data-floor') === '1') {
        originalPosterIDCache = originalPosterElement.querySelector('.userid').textContent.trim().toLowerCase();
        originalPosterIDCacheURL = targetURL;
        return originalPosterIDCache;
      } else {
        originalPosterIDCache = '';
        originalPosterIDCacheURL = targetURL;
        return '';
      }
    }
    originalPosterIDCache = '';
    originalPosterIDCacheURL = targetURL;
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

// Debounce utility
function debounce(fn, delay) {
  let timer = null;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// Initial run
highlightOriginalPoster();

// Debounced version for observer
const debouncedHighlight = debounce(highlightOriginalPoster, 300);

// Observe DOM changes for unfolding comments
const observer = new MutationObserver(() => {
  debouncedHighlight();
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});