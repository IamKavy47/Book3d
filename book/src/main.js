// main.js - This file will import dependencies and initialize your app

// Import Three.js modules properly for ES modules environment
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Book constants
const PAGE_WIDTH = 1.28;
const PAGE_HEIGHT = 1.71; // ~4:3 aspect ratio
const PAGE_DEPTH = 0.003;
const PAGE_SEGMENTS = 30;
const SEGMENT_WIDTH = PAGE_WIDTH / PAGE_SEGMENTS;

// Animation parameters
const EASING_FACTOR = 0.5; // controls the speed of the easing
const EASING_FACTOR_FOLD = 0.3; // controls the speed of the easing
const INSIDE_CURVE_STRENGTH = 0.18; // Controls the strength of the curve
const OUTSIDE_CURVE_STRENGTH = 0.05; // Controls the strength of the curve
const TURNING_CURVE_STRENGTH = 0.09; // Controls the strength of the curve

// Book content
const pages = [
  {
    front: "cover",
    back: "page1",
    content: "This is the cover of our amazing book.",
  },
  {
    front: "page1",
    back: "page2",
    content: "Once upon a time in a land far away, there lived a curious explorer who loved to discover new places.",
  },
  {
    front: "page2",
    back: "page3",
    content: "The explorer had a magical map that would reveal hidden treasures and mysterious locations.",
  },
  {
    front: "page3",
    back: "page4",
    content: "One day, while studying the map, a strange symbol appeared that the explorer had never seen before.",
  },
  {
    front: "page4",
    back: "page5",
    content: "The symbol led to an ancient library filled with books containing the knowledge of forgotten civilizations.",
  },
  {
    front: "page5",
    back: "page6",
    content: "In the library, the explorer found a book just like this one, which told stories of other explorers.",
  },
  {
    front: "page6",
    back: "page7",
    content: "Each explorer had discovered something unique that changed the world in some small but significant way.",
  },
  {
    front: "page7",
    back: "page8",
    content: "The book revealed that the greatest treasures were not gold or jewels, but knowledge and understanding.",
  },
  {
    front: "page8",
    back: "page9",
    content: "Inspired by these stories, our explorer decided to share all discoveries with the world.",
  },
  {
    front: "page9",
    back: "page10",
    content: "And so began a new journey of sharing knowledge and inspiring future generations of explorers.",
  },
  {
    front: "page10",
    back: "page11",
    content: "The explorer created schools and libraries where people could learn about the wonders of the world.",
  },
  {
    front: "page11",
    back: "page12",
    content: "Students from all over came to learn, and many became explorers themselves, continuing the cycle.",
  },
  {
    front: "page12",
    back: "backcover",
    content: "And that is how a single discovery can change the world. The End.",
  },
];

// Global variables
let currentPage = 0;
let delayedPage = 0;
let scene, camera, renderer, controls;
let pageObjects = [];
let animationTimeout;
let clock;
let raycaster, mouse;
let hoveredObject = null;

// DOM elements
let prevBtn, nextBtn, pageCounter, bookCanvas;

// Initialize the 3D scene
function init() {
  // Get DOM elements
  prevBtn = document.getElementById('prev-btn');
  nextBtn = document.getElementById('next-btn');
  pageCounter = document.getElementById('page-counter');
  bookCanvas = document.getElementById('book-canvas');
  
  // Create scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xfffbeb); // Match the background color from CSS
  
  // Create camera
  camera = new THREE.PerspectiveCamera(50, bookCanvas.clientWidth / bookCanvas.clientHeight, 0.1, 1000);
  camera.position.set(0, 0, 5);
  
  // Create renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(bookCanvas.clientWidth, bookCanvas.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  bookCanvas.appendChild(renderer.domElement);
  
  // Add lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);
  
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(10, 10, 10);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 1024;
  directionalLight.shadow.mapSize.height = 1024;
  scene.add(directionalLight);
  
  // Add orbit controls - Note using imported OrbitControls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enableZoom = true;
  controls.enablePan = false;
  controls.minPolarAngle = Math.PI / 2.5;
  controls.maxPolarAngle = Math.PI / 1.5;
  
  // Create book group
  const bookGroup = new THREE.Group();
  bookGroup.rotation.y = Math.PI / 2.1*Math.PI;
  scene.add(bookGroup);
  
  // Create page geometry
  const pageGeometry = createPageGeometry();
  
  // Create pages
  pages.forEach((pageData, index) => {
    const page = createPage(pageGeometry, index, pageData);
    bookGroup.add(page.group);
    pageObjects.push(page);
  });
  
  // Setup raycasting
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();
  setupRaycasting();
  
  // Add event listeners
  prevBtn.addEventListener('click', previousPage);
  nextBtn.addEventListener('click', nextPage);
  
  // Handle window resize
  window.addEventListener('resize', onWindowResize);
  
  // Initialize clock for animation
  clock = new THREE.Clock();
  
  // Start animation loop
  animate();
  
  // Update UI
  updateUI();
}

// Create page geometry with skinning
function createPageGeometry() {
  const geometry = new THREE.BoxGeometry(PAGE_WIDTH, PAGE_HEIGHT, PAGE_DEPTH, PAGE_SEGMENTS, 2);
  
  // Set the anchor origin of the book to the left
  geometry.translate(PAGE_WIDTH / 2, 0, 0);
  
  // Get all positions from our geometry
  const position = geometry.attributes.position;
  
  // Create arrays for skin indices and weights
  const skinIndices = [];
  const skinWeights = [];
  
  // Loop through each position (vertex)
  for (let i = 0; i < position.count; i++) {
    // Get vertex position
    const vertex = new THREE.Vector3();
    vertex.fromBufferAttribute(position, i);
    const x = vertex.x;
    
    // Calculate skin index and weight
    const skinIndex = Math.max(0, Math.min(PAGE_SEGMENTS - 1, Math.floor(x / SEGMENT_WIDTH)));
    const skinWeight = (x % SEGMENT_WIDTH) / SEGMENT_WIDTH;
    
    // Set skin indices and weights
    skinIndices.push(skinIndex, Math.min(skinIndex + 1, PAGE_SEGMENTS), 0, 0);
    skinWeights.push(1 - skinWeight, skinWeight, 0, 0);
  }
  
  // Add skin indices and weights to geometry
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));
  
  return geometry;
}

// Generate texture for page
function generatePageTexture(text, isPage = true) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024; // Increased resolution for better text quality
  canvas.height = 768;
  const ctx = canvas.getContext('2d');
  
  if (ctx) {
    // Background
    if (isPage) {
      ctx.fillStyle = '#f5f5dc'; // Beige for pages
    } else {
      ctx.fillStyle = '#8B4513'; // Brown for cover
    }
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (!isPage) {
      // Add texture details for cover
      ctx.fillStyle = '#6B3100';
      for (let i = 0; i < 1000; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const size = Math.random() * 3 + 1;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Add gold border
      ctx.strokeStyle = '#DAA520';
      ctx.lineWidth = 20;
      ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);
    }
    
    // Add text
    ctx.fillStyle = isPage ? '#333' : '#DAA520';
    ctx.font = isPage ? '28px serif' : 'bold 48px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Wrap text
    const words = text.split(' ');
    let line = '';
    const lineHeight = isPage ? 36 : 60;
    let lines = [];
    
    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      
      if (testWidth > canvas.width - 100 && i > 0) {
        lines.push(line);
        line = words[i] + ' ';
      } else {
        line = testLine;
      }
    }
    lines.push(line);
    
    // Center text vertically
    const startY = canvas.height / 2 - (lines.length * lineHeight) / 2;
    
    // Draw text
    lines.forEach((line, index) => {
      ctx.fillText(line, canvas.width / 2, startY + index * lineHeight);
    });
    
    // Page number for pages
    if (isPage && text !== "This is the cover of our amazing book.") {
      ctx.font = 'italic 18px serif';
      ctx.fillText('Page ' + (text === "And that is how a single discovery can change the world. The End." ? 'End' : lines.length), canvas.width - 70, canvas.height - 30);
    }
  }
  
  return canvas;
}

// Create a page with bones and skinning
function createPage(geometry, index, pageData) {
  const group = new THREE.Group();
  
  // Determine if this is a cover
  const isCover = index === 0 || index === pages.length - 1;
  
  // Generate textures
  const frontCanvas = generatePageTexture(pageData.front === 'cover' ? 'My Book' : pageData.content, !isCover);
  const backCanvas = generatePageTexture(pageData.back === 'backcover' ? 'The End' : pageData.content, !isCover);
  
  const frontTexture = new THREE.CanvasTexture(frontCanvas);
  const backTexture = new THREE.CanvasTexture(backCanvas);
  
  frontTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  backTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  
  // Create bones
  const bones = [];
  for (let i = 0; i <= PAGE_SEGMENTS; i++) {
    const bone = new THREE.Bone();
    bone.name = `bone_${i}`;
    bones.push(bone);
    
    if (i === 0) {
      bone.position.x = 0;
    } else {
      bone.position.x = SEGMENT_WIDTH;
    }
    
    if (i > 0) {
      bones[i - 1].add(bone);
    }
  }
  
  const skeleton = new THREE.Skeleton(bones);
  
  // Create materials
  const whiteColor = new THREE.Color('white');
  const emissiveColor = new THREE.Color('orange');
  const roughness = isCover ? 0.7 : 0.1;
  
  const materials = [
    new THREE.MeshStandardMaterial({ color: whiteColor }), // right edge
    new THREE.MeshStandardMaterial({ color: '#111' }),     // left edge
    new THREE.MeshStandardMaterial({ color: whiteColor }), // top edge
    new THREE.MeshStandardMaterial({ color: whiteColor }), // bottom edge
    new THREE.MeshStandardMaterial({                       // front face
      color: whiteColor,
      map: frontTexture,
      roughness: roughness,
      emissive: emissiveColor,
      emissiveIntensity: 0,
    }),
    new THREE.MeshStandardMaterial({                       // back face
      color: whiteColor,
      map: backTexture,
      roughness: roughness,
      emissive: emissiveColor,
      emissiveIntensity: 0,
    }),
  ];
  
  // Create skinned mesh
  const mesh = new THREE.SkinnedMesh(geometry, materials);
  mesh.name = `page_${index}`;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  mesh.add(bones[0]);
  mesh.bind(skeleton);
  
  // Add to group
  group.add(mesh);
  
  // Store page data
  const pageObject = {
    index,
    group,
    mesh,
    skeleton,
    highlighted: false,
    turnedAt: 0,
    lastOpened: false,
    
    setHighlighted: function(value) {
      this.highlighted = value;
    },
    
    update: function(delta, page, opened, bookClosed) {
      // Update emissive intensity for highlighting
      const emissiveIntensity = this.highlighted ? 0.22 : 0;
      this.mesh.material[4].emissiveIntensity = THREE.MathUtils.lerp(
        this.mesh.material[4].emissiveIntensity, 
        emissiveIntensity, 
        0.1
      );
      this.mesh.material[5].emissiveIntensity = THREE.MathUtils.lerp(
        this.mesh.material[5].emissiveIntensity, 
        emissiveIntensity, 
        0.1
      );
      
      // Handle page turning animation
      if (this.lastOpened !== opened) {
        this.turnedAt = Date.now();
        this.lastOpened = opened;
      }
      
      let turningTime = Math.min(400, Date.now() - this.turnedAt) / 400;
      turningTime = Math.sin(turningTime * Math.PI);
      
      let targetRotation = opened ? -Math.PI / 2 : Math.PI / 2;
      if (!bookClosed) {
        targetRotation += THREE.MathUtils.degToRad(this.index * 0.8);
      }
      
      const bones = this.skeleton.bones;
      for (let i = 0; i < bones.length; i++) {
        const bone = bones[i];
        
        const insideCurveIntensity = i < 8 ? Math.sin(i * 0.2 + 0.25) : 0;
        const outsideCurveIntensity = i >= 8 ? Math.cos(i * 0.3 + 0.09) : 0;
        const turningIntensity = Math.sin(i * Math.PI * (1 / bones.length)) * turningTime;
        
        let rotationAngle = 
          INSIDE_CURVE_STRENGTH * insideCurveIntensity * targetRotation -
          OUTSIDE_CURVE_STRENGTH * outsideCurveIntensity * targetRotation +
          TURNING_CURVE_STRENGTH * turningIntensity * targetRotation;
        
        let foldRotationAngle = THREE.MathUtils.degToRad(Math.sin(targetRotation) * 2);
        
        if (bookClosed) {
          if (i === 0) {
            rotationAngle = targetRotation;
            foldRotationAngle = 0;
          } else {
            rotationAngle = 0;
            foldRotationAngle = 0;
          }
        }
        
        // Apply easing to rotation
        const currentRotationY = bone.rotation.y;
        const targetRotationY = rotationAngle;
        bone.rotation.y += (targetRotationY - currentRotationY) * EASING_FACTOR * delta;
        
        const foldIntensity = i > 8 ? Math.sin(i * Math.PI * (1 / bones.length) - 0.5) * turningTime : 0;
        
        // Apply easing to fold rotation
        const currentRotationX = bone.rotation.x;
        const targetRotationX = foldRotationAngle * foldIntensity;
        bone.rotation.x += (targetRotationX - currentRotationX) * EASING_FACTOR_FOLD * delta;
      }
      
      // Update z-position
      this.mesh.position.z = -this.index * PAGE_DEPTH + page * PAGE_DEPTH;
    },
    
    onPointerEnter: function() {
      this.setHighlighted(true);
      document.body.style.cursor = 'pointer';
    },
    
    onPointerLeave: function() {
      this.setHighlighted(false);
      document.body.style.cursor = 'default';
    },
    
    onClick: function() {
      const newPage = this.lastOpened ? this.index : this.index + 1;
      setPage(newPage);
      this.setHighlighted(false);
    }
  };
  
  return pageObject;
}

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  
  const delta = clock.getDelta();
  
  // Update pages
  pageObjects.forEach(page => {
    page.update(
      delta, 
      delayedPage, 
      delayedPage > page.index, 
      delayedPage === 0 || delayedPage === pages.length
    );
  });
  
  // Update controls
  controls.update();
  
  // Check for raycasting
  checkIntersection();
  
  // Render scene
  renderer.render(scene, camera);
}

// Handle window resize
function onWindowResize() {
  camera.aspect = bookCanvas.clientWidth / bookCanvas.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(bookCanvas.clientWidth, bookCanvas.clientHeight);
}

// Set page with animation
function setPage(page) {
  currentPage = Math.max(0, Math.min(pages.length - 1, page));
  updateDelayedPage();
  updateUI();
}

// Go to previous page
function previousPage() {
  setPage(currentPage - 1);
}

// Go to next page
function nextPage() {
  setPage(currentPage + 1);
}

// Update delayed page for animation
function updateDelayedPage() {
  clearTimeout(animationTimeout);
  
  const goToPage = () => {
    if (currentPage === delayedPage) {
      return;
    }
    
    const delay = Math.abs(currentPage - delayedPage) > 2 ? 50 : 150;
    
    if (currentPage > delayedPage) {
      delayedPage++;
    } else if (currentPage < delayedPage) {
      delayedPage--;
    }
    
    updateUI();
    
    if (currentPage !== delayedPage) {
      animationTimeout = setTimeout(goToPage, delay);
    }
  };
  
  goToPage();
}

// Update UI elements
function updateUI() {
  pageCounter.textContent = `Page ${currentPage} of ${pages.length - 1}`;
  prevBtn.disabled = currentPage <= 0;
  nextBtn.disabled = currentPage >= pages.length - 1;
}

// Setup raycasting for interactivity
function setupRaycasting() {
  renderer.domElement.addEventListener('mousemove', onMouseMove);
  renderer.domElement.addEventListener('click', onClick);
}

// Handle mouse move for raycasting
function onMouseMove(event) {
  // Calculate mouse position in normalized device coordinates
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

// Handle click for raycasting
function onClick() {
  if (hoveredObject) {
    hoveredObject.onClick();
  }
}

// Check for intersections with raycaster
function checkIntersection() {
  // Update the raycaster
  raycaster.setFromCamera(mouse, camera);
  
  // Get all meshes to check
  const meshes = pageObjects.map(page => page.mesh);
  
  // Find intersections
  const intersects = raycaster.intersectObjects(meshes);
  
  // Find the first intersected page
  let intersectedPage = null;
  if (intersects.length > 0) {
    const meshName = intersects[0].object.name;
    const pageIndex = parseInt(meshName.split('_')[1]);
    intersectedPage = pageObjects.find(page => page.index === pageIndex);
  }
  
  // Handle hover state
  if (hoveredObject !== intersectedPage) {
    if (hoveredObject) {
      hoveredObject.onPointerLeave();
    }
    
    hoveredObject = intersectedPage;
    
    if (hoveredObject) {
      hoveredObject.onPointerEnter();
    }
  }
}

// Initialize the application when the DOM is ready
document.addEventListener('DOMContentLoaded', init);

// Export init function if needed elsewhere
export { init };