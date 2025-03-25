// Video Stumble - Main JavaScript for Webflow Integration
// This file contains the core functionality for the Video Stumble application

// Supabase configuration - using the public anon key (safe for client-side)
const SUPABASE_URL = 'https://nlejaciidjebkufybtpx.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sZWphY2lpZGplYmt1ZnlidHB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI4MDkyMjYsImV4cCI6MjA1ODM4NTIyNn0.xXsukS0EdDRdpy0t4aDIFJJa4nYH4_50ismmHmKwpHk';

// DOM Elements
let videoContainer;
let videoThumbnail;
let videoTitle;
let channelName;
let videoDescription;
let stumbleButton;
let shareButton;
let loadingSpinner;
let toastContainer;
let playButton;
let videoTitleOverlay;

// State
let currentVideo = null;
let isLoading = false;
let isCopying = false;

// Initialize the application when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  // Get references to DOM elements
  videoContainer = document.getElementById('video-container');
  videoThumbnail = document.getElementById('video-thumbnail');
  videoTitle = document.getElementById('video-title');
  channelName = document.getElementById('channel-name');
  videoDescription = document.getElementById('video-description');
  stumbleButton = document.getElementById('stumble-button');
  shareButton = document.getElementById('share-button');
  loadingSpinner = document.getElementById('loading-spinner');
  toastContainer = document.getElementById('toast-container');
  playButton = document.getElementById('play-button');
  videoTitleOverlay = document.getElementById('video-title-overlay');

  // Check if we're on the home page or video page
  const isHomePage = !window.location.pathname.includes('/video');
  
  // Setup click handlers
  if (stumbleButton) {
    stumbleButton.addEventListener('click', handleStumble);
  }
  
  if (shareButton) {
    shareButton.addEventListener('click', () => handleShare(isHomePage));
  }
  
  if (videoThumbnail) {
    videoThumbnail.addEventListener('click', playVideo);
  }
  
  if (playButton) {
    playButton.addEventListener('click', playVideo);
  }
  
  // Initialize the page based on URL parameters
  initializePage(isHomePage);
});

// Initialize the page based on whether it's the home page or video page
async function initializePage(isHomePage) {
  setLoading(true);
  
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const videoId = isHomePage ? urlParams.get('video') : urlParams.get('id');
    
    if (videoId) {
      // Load specific video from URL parameter
      const video = await getVideoById(videoId);
      if (video) {
        updateUI(video);
        setLoading(false);
        return;
      }
    }
    
    // If no video ID in URL or video not found, and we're on home page,
    // fetch a random video (only for home page)
    if (isHomePage) {
      await fetchRandomVideo();
    } else {
      // On video page with no valid ID, show error state
      showErrorState("Video not found");
    }
  } catch (error) {
    console.error('Error initializing page:', error);
    showErrorState("Failed to load video");
  } finally {
    setLoading(false);
  }
}

// Play the video when thumbnail is clicked
function playVideo(e) {
  if (!currentVideo) return;
  
  // Stop event propagation to prevent double-playing
  if (e) {
    e.stopPropagation();
  }
  
  const iframe = document.createElement('iframe');
  iframe.setAttribute('src', `https://www.youtube.com/embed/${currentVideo.video_id}?autoplay=1`);
  iframe.setAttribute('frameborder', '0');
  iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
  iframe.setAttribute('allowfullscreen', 'true');
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.position = 'absolute';
  iframe.style.top = '0';
  iframe.style.left = '0';
  
  // Clear the container and insert the iframe
  videoContainer.innerHTML = '';
  videoContainer.appendChild(iframe);
}

// Handle clicking the "Stumble" button
async function handleStumble() {
  if (isLoading) return;
  
  // Add pressed effect
  stumbleButton.classList.add('pressed');
  setTimeout(() => stumbleButton.classList.remove('pressed'), 300);
  
  // Clear the current video content
  videoContainer.innerHTML = '';
  
  // Re-add the thumbnail elements
  videoContainer.innerHTML = `
    <img id="video-thumbnail" class="video-thumbnail" src="https://img.youtube.com/vi/placeholder/maxresdefault.jpg" alt="Video Thumbnail">
    <div id="play-button" class="play-button">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
    </div>
    <div class="video-title-overlay" id="video-title-overlay"></div>
    <div id="loading-spinner" class="loading-spinner"></div>
  `;
  
  // Re-get the elements
  videoThumbnail = document.getElementById('video-thumbnail');
  playButton = document.getElementById('play-button');
  loadingSpinner = document.getElementById('loading-spinner');
  videoTitleOverlay = document.getElementById('video-title-overlay');
  
  // Re-attach event listeners
  videoThumbnail.addEventListener('click', playVideo);
  playButton.addEventListener('click', playVideo);
  
  await fetchRandomVideo();
}

// Fetch a random intellectual video from Supabase
async function fetchRandomVideo() {
  setLoading(true);
  
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/videos?select=*&category=eq.Intellectual&limit=10`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch videos');
    }
    
    const videos = await response.json();
    
    if (!videos || videos.length === 0) {
      showErrorState("No videos found");
      return;
    }
    
    // Select a random video from the results
    const randomIndex = Math.floor(Math.random() * videos.length);
    const randomVideo = videos[randomIndex];
    
    // Update UI with the new video
    updateUI(randomVideo);
    
    // Update URL with the new video ID (only on home page)
    if (window.location.pathname !== '/video') {
      const url = new URL(window.location);
      url.searchParams.set('video', randomVideo.video_id);
      window.history.pushState({}, '', url);
    }
  } catch (error) {
    console.error('Error fetching random video:', error);
    showErrorState("Failed to load video");
  } finally {
    setLoading(false);
  }
}

// Get a specific video by its ID
async function getVideoById(videoId) {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/videos?select=*&video_id=eq.${videoId}`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Accept': 'application/vnd.pgrst.object+json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch video');
    }
    
    const video = await response.json();
    return video;
  } catch (error) {
    console.error('Error fetching video by ID:', error);
    return null;
  }
}

// Update the UI with the video data
function updateUI(video) {
  if (!video) return;
  
  currentVideo = video;
  
  // Set video thumbnail
  if (videoThumbnail) {
    videoThumbnail.src = `https://img.youtube.com/vi/${video.video_id}/maxresdefault.jpg`;
    videoThumbnail.alt = video.title;
    videoThumbnail.onerror = function() {
      if (videoThumbnail.src !== `https://img.youtube.com/vi/${video.video_id}/hqdefault.jpg`) {
        videoThumbnail.src = `https://img.youtube.com/vi/${video.video_id}/hqdefault.jpg`;
      }
    };
    videoContainer.style.display = 'block';
  }
  
  // Set video title in overlay
  if (videoTitleOverlay) {
    videoTitleOverlay.textContent = video.title;
  }
  
  // Set video info
  if (videoTitle) videoTitle.textContent = video.title;
  if (channelName) channelName.textContent = video.channel_name;
  if (videoDescription) videoDescription.textContent = video.description || '';
}

// Show toast notification
function showToast(title, message, isError = false) {
  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast ${isError ? 'toast-error' : 'toast-success'}`;
  
  toast.innerHTML = `
    <div class="toast-content">
      <h4>${title}</h4>
      <p>${message}</p>
    </div>
    <button class="toast-close">&times;</button>
  `;
  
  // Add to container
  toastContainer.appendChild(toast);
  
  // Add event listener to close button
  const closeBtn = toast.querySelector('.toast-close');
  closeBtn.addEventListener('click', () => {
    toast.classList.add('toast-hiding');
    setTimeout(() => {
      toast.remove();
    }, 300);
  });
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    if (toast.parentNode) {
      toast.classList.add('toast-hiding');
      setTimeout(() => {
        if (toast.parentNode) toast.remove();
      }, 300);
    }
  }, 5000);
  
  // Animate in
  setTimeout(() => {
    toast.classList.add('toast-visible');
  }, 10);
}

// Handle share button click
async function handleShare(isHomePage) {
  if (!currentVideo || isCopying) return;
  
  try {
    isCopying = true;
    
    // Show loading state in share button
    if (shareButton) {
      shareButton.innerHTML = '<div class="button-spinner"></div>';
    }
    
    // Generate the URL based on current page
    const baseUrl = window.location.origin;
    const shareUrl = isHomePage
      ? `${baseUrl}/video?id=${currentVideo.video_id}`
      : `${baseUrl}/video?id=${currentVideo.video_id}`;
    
    // Try to use the clipboard API
    await navigator.clipboard.writeText(shareUrl);
    
    // Show success toast
    showToast("Link copied!", "Video link has been copied to your clipboard.");
  } catch (error) {
    console.error('Failed to copy:', error);
    showToast("Failed to copy link", "Please try again or copy the URL manually.", true);
  } finally {
    isCopying = false;
    
    // Restore share button
    if (shareButton) {
      shareButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>';
    }
  }
}

// Set loading state
function setLoading(loading) {
  isLoading = loading;
  
  if (loadingSpinner) {
    loadingSpinner.style.display = loading ? 'block' : 'none';
  }
  
  if (stumbleButton) {
    stumbleButton.disabled = loading;
    if (loading) {
      stumbleButton.innerHTML = '<div class="button-spinner"></div> Loading...';
    } else {
      stumbleButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg> Stumble Next Video';
    }
  }
}

// Show error state in the UI
function showErrorState(message) {
  if (videoContainer) {
    videoContainer.innerHTML = `<div class="error-message">${message}</div>`;
  }
  
  if (videoTitle) videoTitle.textContent = "Video not found";
  if (channelName) channelName.textContent = "";
  if (videoDescription) videoDescription.textContent = "";
}
