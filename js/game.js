var Game = {
  scaleFactor: 1,
  properties: {
    anaglyph: false,
    invulnerable: true,
    tunnelLength: 15.0,
    tunnelWidth: 2.0,
    tunnelHeight: 1.0,
    blockSize: 0.2,
    blockSizeH: 0.3,
    blockSizeV: 0.4,
    blockSpeed: 0.007,
    blocksSpacing: 0,
    markerOffset: 1.0,
    markersRate: 5,
    count: 15,
    blocksColor: 0xdddddd,
    blocksColorSolid: 0x000000,
    tunnelColor: 0x888888,
    backgroundColor: 0x000000,
    lineWidth: 2,
    targetPlayerRate: 0.9
  },
  objects: {
    blocks: [],
    markers: [],
    tunnel: undefined
  },
  stuff: {
  }
};

Game.initGeometry = function() {
  Game.stuff.markerGeometry = new THREE.PlaneGeometry(Game.properties.tunnelWidth, Game.properties.tunnelHeight);
  Game.stuff.markerGeometry = new THREE.EdgesGeometry(Game.stuff.markerGeometry);
  
  Game.stuff.blockHGeometry = new THREE.BoxGeometry(Game.properties.tunnelWidth, Game.properties.blockSizeH, Game.properties.blockSize);
  Game.stuff.blockVGeometry = new THREE.BoxGeometry(Game.properties.blockSizeV, Game.properties.tunnelHeight, Game.properties.blockSize);
  
  Game.stuff.blockHGeometryEdges = new THREE.EdgesGeometry(Game.stuff.blockHGeometry);
  Game.stuff.blockVGeometryEdges = new THREE.EdgesGeometry(Game.stuff.blockVGeometry);
  Game.stuff.blockMaterial = new THREE.LineBasicMaterial({
    color: Game.properties.blocksColor,
    linewidth: Game.properties.lineWidth
  });
  Game.stuff.blockMaterialSolid = new THREE.MeshPhongMaterial({
    color: Game.properties.blocksColorSolid,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1
  });
}

Game.initFont = function() {
  Game.loader = new THREE.FontLoader();
  Game.loader.load( 'fonts/helvetiker_regular.typeface.json', function (font) {
    Game.font = font;    
  });
}

Game.init = function() {  
  // Create scene
  Game.scene = new THREE.Scene();
  Game.scene.background = new THREE.Color(Game.properties.backgroundColor);
  Game.scene.fog = new THREE.FogExp2(Game.properties.backgroundColor, 0.1);
  
  // Create camera
  Game.camera = new THREE.PerspectiveCamera(45, window.innerWidth/window.innerHeight, 0.1, 1000);
  Game.camera.near = 0.001;
  // Game.camera.fov = 90;
  
  // Create renderer
  Game.renderer = new THREE.WebGLRenderer();
  Game.renderer.setSize(window.innerWidth * Game.scaleFactor, window.innerHeight * Game.scaleFactor, false);
  Game.renderer.domElement.id = "gameview";
  $("body").append(Game.renderer.domElement);
  
  // Anaglyph effect
  Game.effect = new THREE.AnaglyphEffect(Game.renderer);
  Game.effect.setSize(window.innerWidth * Game.scaleFactor, window.innerWidth * Game.scaleFactor, false);
  
  // Register window resize event
  window.addEventListener('resize', Game.onWindowResize, false);
  // Register mouse move event
  window.addEventListener('mousemove', Game.onMouseMove, false);
  
  // Init Raycaster
  Game.stuff.raycaster = new THREE.Raycaster();
  Game.stuff.directionVector = new THREE.Vector3(0, 0, 1);
  Game.stuff.directionVector.normalize();
  
  // Create world
  // Game.initFont();
  Game.initGeometry();
  Game.spawnTunnel();
  Game.spawnPlayer();
  Game.spawnLevel();
  
  // Start game
  Game.lastFrame = new Date();
  Game.update();
}

Game.reset = function() {
  Game.properties.invulnerable = false;
  Game.gameStartDate = new Date();
  Game.gameEnded = new Date();
  $("#start").hide();
}

Game.end = function() {
  Game.properties.invulnerable = true;
  Game.gameEnded = new Date();
  var time = Game.gameEnded - Game.gameStartDate;
  $("#score").text(time);
  $("#message").text("Click to restart!");
  $("#start").show();
  $("#score").show();
}

Game.update = function() {
  // Update game time
  Game.currentFrame = new Date();
  Game.delta = Game.currentFrame - Game.lastFrame;
  
  // Request next frame
  requestAnimationFrame(Game.update);
  
  // Update camera
  Game.updateCamera();
  
  // Update objects
  Game.updateObjects();
  
  // Check for collision
  Game.checkCollision();
  
  // Update score
  Game.updateScore();
  
  // Render scene
  if (Game.properties.anaglyph) {
    Game.effect.render(Game.scene, Game.camera);
  } else {
    Game.renderer.render(Game.scene, Game.camera);
  }
  
  // Update game time
  Game.lastFrame = Game.currentFrame;
}

Game.updateCamera = function() {
  if (Game.properties.tracker) {
    // Use tracker position    
    Game.camera.position.x = (0.5 - Game.trackerX) * 2;
    Game.camera.position.y = (0.5 - Game.trackerY) * 1;
  } else {
    // Use mouse position    
    Game.camera.position.x = (0.5 - Game.mouseX) * 2;
    Game.camera.position.y = (0.5 - Game.mouseY) * 1;
  }
}

Game.updateObjects = function() {
  // Move all blocks
  for (var i = 0; i < Game.objects.blocks.length; i++) {
    var block = Game.objects.blocks[i];
    block.position.z -= Game.properties.blockSpeed * Game.delta;
    if (block.position.z < 0) ;
  }
  
  // Update closest block
  var closestBlock = Game.objects.blocks[Game.closestBlock];
  if (closestBlock.position.z < 0) {
    Game.resetBlock(closestBlock);
    Game.closestBlock = (Game.closestBlock + 1) % Game.properties.count;
  }
  
  // Move all markers
  for (var i = 0; i < Game.objects.markers.length; i++) {
    var marker = Game.objects.markers[i];
    marker.position.z -= Game.properties.blockSpeed * Game.delta;
    if (marker.position.z < 0) Game.resetMarker(marker);
  }
}

Game.checkCollision = function() {
  if (Game.properties.invulnerable) return;
  Game.camera.updateMatrixWorld();
  Game.stuff.raycaster.set(Game.camera.position, Game.stuff.directionVector);
  var intersects = Game.stuff.raycaster.intersectObject(Game.objects.blocks[Game.closestBlock]);
  if (intersects.length > 0 && intersects[0].distance < 0.25) {
    Game.end();
  }
}

Game.updateScore = function() {
  if (Game.properties.invulnerable) {
    // Do nothing...
  } else {
    var currentDate = new Date();
    var time = currentDate - Game.gameStartDate;
    $("#score").text(time);
    
    // Check if score needs to be shown
    // var current = Math.round(time / 10000) * 10000;
    // if (current != Game.stuff.currentScore) {
    //   Game.showScore();
    //   Game.stuff.currentScore = current;
    // }
  }
}

Game.showScore = function() {
  var currentDate = new Date();
  var time = currentDate - Game.gameStartDate;
  time = Math.round(time / 10000);
  var geometry = new THREE.TextGeometry(time, {
    font: Game.font,
    size: 0.5,
    height: 0
  });
  
  Game.scoreMesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: Game.properties.blocksColor }));
  Game.scoreMesh.position.set(-Game.properties.tunnelWidth / 2, -Game.properties.tunnelHeight / 4, -1.5);
  Game.scoreMesh.rotateY(Math.PI / 2);
  Game.appendScoreToMarker = true;
}

Game.spawnLevel = function() {
  // Clean level if needed
  for (var i = 0; i < Game.objects.blocks.length; i++) {
    var block = Game.objects.blocks[i];
    Game.scene.remove(block);
  }
  
  for (var i = 0; i < Game.objects.markers.length; i++) {
    var marker = Game.objects.markers[i];
    Game.scene.remove(marker);
  }
  
  // Reset arrays
  Game.objects.blocks = [];
  Game.objects.markers = [];
  
  // Calculate spacing
  Game.properties.blocksSpacing = Game.properties.tunnelLength / Game.properties.count;
  
  // Create blocks
  for (var i = 0; i < Game.properties.count; i++) {
    Game.spawnBlock(i);
  }
  Game.closestBlock = 0;
  
  // Create markers
  for (var i = 0; i < Game.properties.count / Game.properties.markersRate; i++) {
    Game.spawnMarker(i);
  }
}

Game.spawnTunnel = function() {
  Game.stuff.tunnelGeometry = new THREE.BoxGeometry(Game.properties.tunnelWidth, Game.properties.tunnelHeight, Game.properties.tunnelLength);
  Game.stuff.tunnelGeometry.translate(0, 0, Game.properties.tunnelLength / 2);
  Game.stuff.tunnelGeometry = new THREE.EdgesGeometry(Game.stuff.tunnelGeometry);
  Game.stuff.tunnelMaterial = new THREE.LineBasicMaterial({
    color: Game.properties.tunnelColor,
    linewidth: Game.properties.lineWidth
  });
  Game.objects.tunnel = new THREE.LineSegments(Game.stuff.tunnelGeometry, Game.stuff.tunnelMaterial);
  Game.scene.add(Game.objects.tunnel);
}

Game.spawnPlayer = function() {
  // Set orientation
  Game.camera.up = new THREE.Vector3(0,1,0);
  Game.camera.position.set(0,0,0);
  Game.camera.lookAt(new THREE.Vector3(0,0,1));
  // Set position
  Game.camera.position.x = 0;
  Game.camera.position.y = 0;
  Game.camera.position.z = 0;
}

Game.spawnBlock = function(spacing) {
  if (!spacing) spacing = 0;
  
  // Select geometry
  var geometryWireframe = Game.stuff.blockHGeometryEdges;
  var geometrySolid = Game.stuff.blockHGeometry;
  
  var vertical = Math.random() >= 0.5;
  if (vertical) {
    geometryWireframe = Game.stuff.blockVGeometryEdges;
    geometrySolid = Game.stuff.blockVGeometry;
  }
  
  // Wireframe
  var wireframeBlock = new THREE.LineSegments(geometryWireframe, Game.stuff.blockMaterial);
  
  // Solid
  var block = new THREE.Mesh(geometrySolid, Game.stuff.blockMaterialSolid);
  block.add(wireframeBlock);
  
  // Set properties
  block.isVertical = vertical;
  Game.resetBlock(block);
  block.position.z = spacing * Game.properties.blocksSpacing;
  
  // Add block
  Game.objects.blocks.push(block);
  Game.scene.add(block);
}

Game.resetBlock = function(block) {
  var targetPlayer = Math.random() >= Game.properties.targetPlayerRate;
  var x = 0;
  var y = 0;
  if (targetPlayer && !Game.properties.invulnerable) {
    // Aim for the player
    if (block.isVertical) {
      var relativePosition = Game.camera.position.x + Game.properties.tunnelWidth / 2;
      relativePosition = relativePosition / Game.properties.tunnelWidth - 0.5;
      x = relativePosition * (Game.properties.tunnelWidth - Game.properties.blockSizeV);
    } else {
      var relativePosition = Game.camera.position.y + Game.properties.tunnelHeight / 2;
      relativePosition = relativePosition / Game.properties.tunnelHeight - 0.5;
      y = relativePosition * (Game.properties.tunnelHeight - Game.properties.blockSizeH);
    }
  } else {
    // Generate random position, considering margins
    var relativePosition = Math.random() - 0.5;
    var threshold = 0.1;
    if (relativePosition <= -0.5 + threshold) relativePosition = -0.5;
    if (relativePosition >= 0.5 - threshold) relativePosition = 0.5;
    if (block.isVertical) {
      x = relativePosition * (Game.properties.tunnelWidth - Game.properties.blockSizeV);
    } else {
      y = relativePosition * (Game.properties.tunnelHeight - Game.properties.blockSizeH);
    }
  }
  block.position.x = x;
  block.position.y = y;
  block.position.z += Game.properties.tunnelLength;
}

Game.spawnMarker = function(spacing) {
  if (!spacing) spacing = 0;
  var marker = new THREE.LineSegments(Game.stuff.markerGeometry, Game.stuff.tunnelMaterial);
  marker.position.z = Game.properties.tunnelLength + Game.properties.markerOffset - spacing * Game.properties.blocksSpacing * Game.properties.markersRate;
  Game.objects.markers.push(marker);
  Game.scene.add(marker);
}

Game.resetMarker = function(marker) {
  // Reset position
  marker.position.z += Game.properties.tunnelLength;
  
  // Remove score text
  if (marker.children.length) {
    marker.remove(marker.children[0]);
  }
  
  // Append new text if needed
  if (Game.appendScoreToMarker) {
    Game.appendScoreToMarker = false;
    marker.add(Game.scoreMesh);
  }
}

Game.onWindowResize = function() {
  Game.camera.aspect = window.innerWidth / window.innerHeight;
  Game.camera.updateProjectionMatrix();
  Game.renderer.setSize(window.innerWidth * Game.scaleFactor, window.innerHeight * Game.scaleFactor, false);
  Game.effect.setSize(window.innerWidth * Game.scaleFactor, window.innerHeight * Game.scaleFactor, false);
}

Game.onMouseMove = function(event) {
  Game.mouseX = event.pageX / window.innerWidth;
  Game.mouseY = event.pageY / window.innerHeight;
}
