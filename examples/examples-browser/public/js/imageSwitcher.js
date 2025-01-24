let isInitialized = false;
let isCameraActive = false;
let stream = null;
let ease = 0;
let pausedAt = 0;
let easeThrashold = 3;
let facePercentageOfImage = 80;
let isChanged = false;

const cameraButton = document.getElementById('cameraButton');
const errorDisplay = document.getElementById('error');
const inputVideo = document.getElementById('inputVideo');
const contentImage = document.getElementById('contentImage');
const easeThrasholdInput = document.getElementById('easeThrashold');
const facePercentageOfImageInput = document.getElementById('facePercentageOfImage');
const detector = new FaceDirectionDetector();
const tinyFaceDetectorOptions = new faceapi.TinyFaceDetectorOptions({
    inputSize: 512,
    scoreThreshold: 0.7
});

// Initialize face-api
async function initFaceAPI() {
    try {
        await Promise.all([
            faceapi.nets.tinyFaceDetector.load('/'),
            faceapi.nets.faceLandmark68Net.load('/')
        ]);
        isInitialized = true;
        cameraButton.disabled = false;
    } catch (err) {
        showError('Failed to load face detection models');
        console.error('Error loading models:', err);
    }
}

// Show error message
function showError(message) {
    errorDisplay.textContent = message;
    errorDisplay.style.display = 'block';
}

// Hide error message
function hideError() {
    errorDisplay.style.display = 'none';
}

// Start camera
async function startCamera() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: 640,
                height: 480,
                facingMode: 'user'
            }
        });
        
        inputVideo.srcObject = stream;
        isCameraActive = true;
        cameraButton.textContent = 'Stop Camera';
        hideError();
        startFaceDetection();
    } catch (err) {
        showError('Failed to access camera');
        console.error('Error accessing camera:', err);
    }
}

// Stop camera
function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        inputVideo.srcObject = null;
        isCameraActive = false;
        cameraButton.textContent = 'Start Camera';
    }
}

function clearEase() {
    ease = 0;
    console.debug('Cleared ease');
}

function incrementEase() {
  if (ease == 0) {
    setTimeout(clearEase, 1000);
    console.debug('Started ease timer');
  } else if (ease == easeThrashold) {
    console.debug('Reached ease thrashold, clearing ease');
    clearEase();
    return;
  }
  
  ease += 1;
  console.debug('Incremented ease:', ease);
}

function isInEase() {
  let inEase = ease > 0 && ease < easeThrashold;
  console.debug("In ease:", inEase);
  return inEase;
}

function showDefaultImage() {
  if (isInEase()) {
    incrementEase();
    return;
  }
  
  contentImage.src = 'bananas-04.jpg';
  isChanged = false;
  console.debug('Showing default image');
  incrementEase();
}

function getRandomBananaImage() {
  const randomNum = Math.floor(Math.random() * 3) + 1;
  const paddedNum = randomNum.toString().padStart(2, '0');
  return `bananas-${paddedNum}.jpg`;
}

function playRandomSound() {
    const randomNum = Math.floor(Math.random() * 3) + 1;
    const paddedNum = randomNum.toString().padStart(2, '0');
    const audio = new Audio(`laugh-${paddedNum}.mp3`);
    audio.play()
        .catch(error => {
            console.error('Error playing sound:', error);
        });
}

function showSideViewImage() {
  console.debug('Entering show side view image');
  if (isInEase()) {
    incrementEase();
    return;
  }
  
  if (isChanged) {
    console.debug('Already changed image');
    return;
  }
  
  let imageName = getRandomBananaImage();
  console.log(imageName);
  contentImage.src = imageName;
  playRandomSound();
  isChanged = true;
  console.debug('Showing side view image');
  incrementEase();
}

async function detect(detector, video, callback) {
    return await detector.startDetection(video, callback);
}

// Face detection loop
async function startFaceDetection() {
    easeThrashold = easeThrasholdInput.value;
    facePercentageOfImage = facePercentageOfImageInput.value;
    const displaySize = {
        width: 640,
        height: 480
    };

    setInterval(detect, 100, detector, inputVideo, (result) => {
        if (result) {
          console.log('Number of faces detected:', result.faces.length);
          
          if (result.faces.length == 0) {
            showDefaultImage();
            return;
          }
          
          result.faces.forEach((face, index) => {
              console.log(`Face ${index + 1}:`, {
                  isFrontal: face.isFrontal,
                  confidence: face.confidence,
                  position: face.position
              });
              if (face.isFrontal) {
                showDefaultImage();
              } else {
                showSideViewImage();
                playRandomSound();
              }
          });
        } else {
            console.error('No result from face detection');
            showDefaultImage();
        }
    })
}

// Event listeners
cameraButton.addEventListener('click', () => {
    if (isCameraActive) {
        stopCamera();
    } else {
        startCamera();
    }
});

// Initialize on load
initFaceAPI();
