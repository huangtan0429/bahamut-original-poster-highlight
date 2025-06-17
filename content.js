function buildURL(bsn, snA) {
  // Construct the URL with the given bsn and snA
  const baseURL = 'https://forum.gamer.com.tw/C.php?';
  const url = new URL(baseURL);
  url.searchParams.set('bsn', bsn);
  url.searchParams.set('snA', snA);
  return url.toString();
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

  if (!currentURL.includes('C.php') && !currentURL.includes('Co.php')) {
    // If not a C.php or Co.php page, exit
    return;
  }

  const absoluteURL = document.querySelector('form[name="frm"]').getAttribute('action');
  let currentURLObj = new URLSearchParams(absoluteURL.split('?')[1]);
  const bsn = currentURLObj.get('bsn');
  const snA = currentURLObj.get('snA');
  const targetURL = buildURL(bsn, snA);
  const originalPosterID = await getOriginalPosterID(targetURL);

  if (!originalPosterID) {
    // If original poster ID is not found, exit
    return;
  }

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