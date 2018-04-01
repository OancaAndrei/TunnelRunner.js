let minColor = [35,10,10,0];
let maxColor = [65,255,255,255];

var Tracker = {
  invertX: true,
  invertY: false,
  debugTracker: true
};

Tracker.startTracking = function() {
  if (!Tracker.initialized) return;
  Tracker.track = true;
  setTimeout(Tracker.processVideo, 0);
}

Tracker.stopTracking = function() {
  Tracker.track = false;
}

Tracker.processVideo = function() {
  if (!Tracker.track) return;  
  try {
    let begin = Date.now();
    
    // Save frame to opencv Matrix
    Tracker.cap.read(Tracker.frame);
    
    // Convert frame to HSV
    cv.cvtColor(Tracker.frame, Tracker.hsv, cv.COLOR_RGB2HSV);
    
    // Filter by range
    cv.inRange(Tracker.hsv, Tracker.minColor, Tracker.maxColor, Tracker.mask);
    cv.erode(Tracker.mask, Tracker.mask, Tracker.M, Tracker.anchor, Tracker.iterations, cv.BORDER_CONSTANT, cv.morphologyDefaultBorderValue());
    cv.dilate(Tracker.mask, Tracker.mask, Tracker.M, Tracker.anchor, Tracker.iterations, cv.BORDER_CONSTANT, cv.morphologyDefaultBorderValue());
    
    // Find contours
    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();
    cv.findContours(Tracker.mask, contours, hierarchy, cv.RETR_CCOMP, cv.CHAIN_APPROX_SIMPLE);
    
    // Select biggest contour
    let minArea = 100;
    let area1 = 0;
    let contour1 = -1;
    
    for (let i = 0; i < contours.size(); ++i) {
      let area = cv.contourArea(contours.get(i), false);
      if (area < minArea) continue;
      if (area >= area1) {
        area1 = area;
        contour1 = i;
      }
    }
    
    // Show selected contours
    if (contour1 != -1) {
      let circle = cv.minEnclosingCircle(contours.get(contour1));
      if (Tracker.debugTracker) {
        cv.circle(Tracker.frame, circle.center, circle.radius, Tracker.color, -1);
      }
      if (Game != undefined) {
        Game.trackerX = circle.center.x / 160;
        Game.trackerY = circle.center.y / 120;
        if (Tracker.invertX) {
          Game.trackerX = 1 - Game.trackerX;
        }
        if (Tracker.invertY) {
          Game.trackerY = 1 - Game.trackerY;
        }
      }
    }
    
    contours.delete();
    hierarchy.delete();
    
    // Show frame
    if (Tracker.debugTracker) {
      cv.imshow('output', Tracker.frame);
    }
    
    // Schedule next frame update
    if (Tracker.track) {
      // let delay = 1000 / Tracker.FPS - (Date.now() - begin);
      setTimeout(Tracker.processVideo, 0);
    }
  } catch (err) {
    console.log(err);
  }
}

Tracker.scriptLoaded = function() {
  setTimeout(function () {
    Tracker.initTracker();
  }, 5000);
};

Tracker.initTracker = function() {
  navigator.mediaDevices.getUserMedia({ audio: false, video: {width: 160, height: 120} })
  .then(function(mediaStream) {
    var videoElement = document.getElementById("video");
    videoElement.srcObject = mediaStream;
    videoElement.onloadedmetadata = function(e) {
      videoElement.play();
      
      Tracker.initialized = true;
      Game.trackerX = 0.5;
      Game.trackerY = 0.5;
      
      Tracker.minColor = new cv.Mat(videoElement.height, videoElement.width, cv.CV_8UC3, minColor);
      Tracker.maxColor = new cv.Mat(videoElement.height, videoElement.width, cv.CV_8UC3, maxColor);
      
      Tracker.M = cv.Mat.ones(5, 5, cv.CV_8U);
      Tracker.anchor = new cv.Point(-1, -1);
      
      Tracker.frame = new cv.Mat(videoElement.height, videoElement.width, cv.CV_8UC4);
      Tracker.hsv = new cv.Mat(videoElement.height, videoElement.width, cv.CV_8UC3);
      Tracker.mask = new cv.Mat(videoElement.height, videoElement.width, cv.CV_8UC1);
      Tracker.cap = new cv.VideoCapture(videoElement);
      Tracker.iterations = 2;
      
      Tracker.color = new cv.Scalar(255, 255, 0, 255);
      
      Tracker.FPS = 30;
      
      $("#tracker").show();
    };
  })
  .catch(function(err) {
    console.log(err.name + ": " + err.message);
    Tracker.initialized = false;
  });    
}