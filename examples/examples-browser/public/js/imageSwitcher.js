let isInitialized = false;
let isCameraActive = false;
let stream = null;
let ease = 0;
let pausedAt = 0;
let easeThrashold = 3;
let isChanged = false;
let soundPlayed = false;

const errorDisplay = document.getElementById('error');
const inputVideo = document.getElementById('inputVideo');
const contentImage = document.getElementById('contentImage');
const detector = new FaceDirectionDetector();
const tinyFaceDetectorOptions = new faceapi.TinyFaceDetectorOptions({
    inputSize: 512,
    scoreThreshold: 0.7
});

async function initFaceAPI() {
    try {
        await Promise.all([
            faceapi.nets.tinyFaceDetector.load('/'),
            faceapi.nets.faceLandmark68Net.load('/')
        ]);
        isInitialized = true;
    } catch (err) {
        showError('Failed to load face detection models');
        console.error('Error loading models:', err);
    }
}

function showError(message) {
    errorDisplay.textContent = message;
    errorDisplay.style.display = 'block';
}

function hideError() {
    errorDisplay.style.display = 'none';
}

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
        hideError();
        startFaceDetection();
    } catch (err) {
        showError('Failed to access camera');
        console.error('Error accessing camera:', err);
    }
}

function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        inputVideo.srcObject = null;
        isCameraActive = false;
    }
}

function clearEase() {
  console.debug(`action='clear ease', ease=${ease}`);
  ease = 0;
}

function incrementEase() {
  if (ease == 0) {
    setTimeout(clearEase, 1000);
    console.debug(`action='increment ease', ease=${ease}`);
  } else if (ease >= easeThrashold) {
    console.debug(`action='increment ease', ease=${ease}`);
    clearEase();
    return;
  }
  
  ease += 1;
  console.debug(`action='increment ease', ease=${ease}`);
}

function isInEase() {
  let inEase = ease > 0 && ease < easeThrashold;
  console.debug(`action='in ease', inEase=${inEase}, ease=${ease}`);
  return inEase;
}

function showDefaultImage() {
  if (isInEase()) {
    console.debug(`action='show default image', ease=${ease}, isChanged=${isChanged}, isInEase=${isInEase()}`);
    incrementEase();
    return;
  }
  if (!isChanged) {
    console.debug(`action='show default image', ease=${ease}, isChanged=${isChanged}, isInEase=${isInEase()}`);
    return;
  }
  
  console.debug(`action='showing default image', ease=${ease}, isChanged=${isChanged}, isInEase=${isInEase()}`);
  contentImage.src = 'bananas-04.jpg';
  isChanged = false;
  soundPlayed = false;
  incrementEase();
}

function getRandomBananaImage() {
  const randomNum = Math.floor(Math.random() * 3) + 1;
  const paddedNum = randomNum.toString().padStart(2, '0');
  return `bananas-${paddedNum}.jpg`;
}

function playRandomSound() {
  if (soundPlayed) {
    console.debug(`action='play random sound', soundPlayed=${soundPlayed}`);
    return;
  }
  
  soundPlayed = true;
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
    const displaySize = {
        width: 640,
        height: 480
    };

    setInterval(detect, 100, detector, inputVideo, (result) => {
        if (result) {
          console.debug(`action='detect callback', faces_detected=${result.faces.length}`);
          
          if (result.faces.length == 0 || result.faces.length > 1) {
            console.debug(`action='detect callback', faces_detected=${result.faces.length}`);
            showDefaultImage();
            return;
          }
          
          let face = result.faces[0];
          console.debug(`action='detect callback', isFrontal=${face.isFrontal}, confidence=${face.confidence}`)
          if (face.isFrontal) {
            showDefaultImage();
          } else {
            showSideViewImage();
            playRandomSound();
          }
        } else {
            console.error('No result from face detection');
            showDefaultImage();
        }
    })
}

initFaceAPI();
startCamera();
