import * as THREE from 'https://esm.sh/three@0.158.0';
import { OrbitControls } from 'https://esm.sh/three@0.158.0/examples/jsm/controls/OrbitControls.js';
import * as TWEEN from 'https://esm.sh/@tweenjs/tween.js@18.6.4';

// Détecteur WebGL - Important de le déclarer avant de l'utiliser dans init()
const Detector = {
    webgl: (function() {
        try {
            const canvas = document.createElement('canvas');
            return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
        } catch (e) {
            return false;
        }
    })()
};

// Configuration de l'immeuble
const buildingConfig = {
    width: 48,
    depth: 9,
    rdcHeight: 4,
    floorHeight: 3,
    totalFloors: 8,
    officeCount: 8,
    scale: 1
};

// Variables Three.js
let scene, camera, renderer, controls;
let building, floors = [];
let isViewMode2D = true;
let isWireframe = false;

// Matériaux - On les créera lors de l'initialisation pour éviter les problèmes potentiels
let materials = {};

// Points de vue intérieurs pour chaque étage
const viewpoints = [];

// Initialisation des points de vue
function initViewpoints() {
    for (let floor = 0; floor < buildingConfig.totalFloors; floor++) {
        const floorY = calculateFloorPosition(floor);
        if (floor === 0) {
            viewpoints[floor] = [
                { name: "Entrée 1 intérieur", position: [23.8, floorY + 1.7, -2.8], target: [20, floorY + 1.7, -2.8] },
                { name: "Entrée 2 intérieur", position: [0, floorY + 1.7, 4.0], target: [0, floorY + 1.7, 0] },
                { name: "Garage 1", position: [-22, floorY + 1.7, 0], target: [-22, floorY + 1.7, 3] },
                { name: "Garage 8", position: [22, floorY + 1.7, 0], target: [22, floorY + 1.7, 3] },
                { name: "Centre RDC", position: [0, floorY + 1.7, 0], target: [0, floorY + 1.7, 4] }
            ];
        } else {
            viewpoints[floor] = [
                { name: "Début couloir", position: [0, floorY + 1.7, -3], target: [0, floorY + 1.7, -2] },
                { name: "Bureau 1", position: [-22, floorY + 1.7, 2], target: [-20, floorY + 1.7, 2] },
                { name: "Bureau 8", position: [22, floorY + 1.7, 2], target: [20, floorY + 1.7, 2] },
                { name: "Centre étage", position: [0, floorY + 1.7, 0], target: [0, floorY + 1.7, 4] }
            ];
        }
    }
}

// Initialisation des matériaux
function initMaterials() {
    materials = {
        structure: new THREE.MeshLambertMaterial({ color: 0xcccccc }),
        glass: new THREE.MeshPhongMaterial({ 
            color: 0x2196F3, 
            transparent: true, 
            opacity: 0.6,
            side: THREE.DoubleSide
        }),
        garages: new THREE.MeshLambertMaterial({ color: 0xFFC107 }),
        offices: new THREE.MeshLambertMaterial({ color: 0x4CAF50 }),
        entrances: new THREE.MeshLambertMaterial({ color: 0xF44336 }),
        elevatorStairs: new THREE.MeshLambertMaterial({ color: 0x9C27B0 }),
        ground: new THREE.MeshLambertMaterial({ color: 0x8B8B8B }),
        wireframe: new THREE.MeshBasicMaterial({ 
            color: 0x000000, 
            wireframe: true 
        })
    };
}

// Initialisation
function init() {
    if (!Detector.webgl) {
        document.getElementById('error-message').textContent = 'WebGL n\'est pas supporté par votre navigateur. Veuillez utiliser un navigateur moderne comme Chrome ou Firefox.';
        document.getElementById('error-message').style.display = 'block';
        document.getElementById('loading-overlay').style.display = 'none';
        return;
    }

    // Initialiser les matériaux et points de vue
    initMaterials();
    initViewpoints();

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);

    const container = document.getElementById('scene-container');
    // Vérifier que le conteneur existe
    if (!container) {
        console.error("Le conteneur de scène n'existe pas");
        return;
    }
    
    camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 1000);

    // Créer le renderer avec la gestion des erreurs
    try {
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.shadowMap.enabled = true;
        container.appendChild(renderer.domElement);
    } catch (e) {
        console.error("Erreur lors de la création du renderer:", e);
        document.getElementById('error-message').style.display = 'block';
        document.getElementById('loading-overlay').style.display = 'none';
        return;
    }

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.screenSpacePanning = false;
    controls.maxDistance = 150;
    controls.maxPolarAngle = Math.PI / 2;

    addLighting();
    addGround();
    createBuilding();
    set2DView();

    window.addEventListener('resize', onWindowResize);
    setupEventListeners();

    animate();
    document.getElementById('loading-overlay').style.display = 'none';
}

// Éclairage
function addLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 70, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -70;
    directionalLight.shadow.camera.right = 70;
    directionalLight.shadow.camera.top = 70;
    directionalLight.shadow.camera.bottom = -70;
    scene.add(directionalLight);

    const light1 = new THREE.PointLight(0xffffff, 0.5);
    light1.position.set(-50, 30, -50);
    scene.add(light1);

    const light2 = new THREE.PointLight(0xffffff, 0.3);
    light2.position.set(50, 30, -50);
    scene.add(light2);
}

// Sol
function addGround() {
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const ground = new THREE.Mesh(groundGeometry, materials.ground);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.1;
    ground.receiveShadow = true;
    scene.add(ground);
}

// Créer l'immeuble
function createBuilding() {
    building = new THREE.Group();
    for (let floor = 0; floor < buildingConfig.totalFloors; floor++) {
        createFloor(floor);
    }
    scene.add(building);
}

// Créer un étage
function createFloor(floorNumber) {
    const floorGroup = new THREE.Group();
    floorGroup.userData = { floorNumber: floorNumber };

    const isRDC = floorNumber === 0;
    const floorHeight = isRDC ? buildingConfig.rdcHeight : buildingConfig.floorHeight;
    const floorPosition = calculateFloorPosition(floorNumber);

    createFloorStructure(floorGroup, floorHeight);
    if (isRDC) {
        createGarages(floorGroup);
        createEntrances(floorGroup);
    } else {
        createOffices(floorGroup);
        createCorridor(floorGroup);
    }
    createElevatorStairs(floorGroup);

    floorGroup.position.y = floorPosition;
    building.add(floorGroup);
    floors.push(floorGroup);
}

// Calculer la position verticale
function calculateFloorPosition(floorNumber) {
    let position = 0;
    for (let i = 0; i < floorNumber; i++) {
        position += (i === 0) ? buildingConfig.rdcHeight : buildingConfig.floorHeight;
    }
    return position;
}

// Structure de l'étage - utiliser des géométries réutilisables quand c'est possible
const floorPlaneGeometry = new THREE.BoxGeometry(1, 0.2, 1); // On va le mettre à l'échelle plutôt que créer de nouvelles géométries
const wallGeometry = new THREE.BoxGeometry(1, 1, 0.2);
const sideWallGeometry = new THREE.BoxGeometry(0.2, 1, 1);

function createFloorStructure(floorGroup, floorHeight) {
    // Plancher
    const floor = new THREE.Mesh(floorPlaneGeometry.clone(), materials.structure);
    floor.scale.set(buildingConfig.width, 1, buildingConfig.depth);
    floor.position.y = -0.1;
    floor.receiveShadow = true;
    floorGroup.add(floor);

    // Plafond
    const ceiling = new THREE.Mesh(floorPlaneGeometry.clone(), materials.structure);
    ceiling.scale.set(buildingConfig.width, 1, buildingConfig.depth);
    ceiling.position.y = floorHeight - 0.1;
    ceiling.receiveShadow = true;
    floorGroup.add(ceiling);

    // Mur arrière
    const backWall = new THREE.Mesh(wallGeometry.clone(), materials.structure);
    backWall.scale.set(buildingConfig.width, floorHeight, 1);
    backWall.position.z = -buildingConfig.depth / 2;
    backWall.position.y = floorHeight / 2;
    backWall.castShadow = true;
    backWall.receiveShadow = true;
    floorGroup.add(backWall);

    // Mur gauche (solide)
    const leftWall = new THREE.Mesh(sideWallGeometry.clone(), materials.structure);
    leftWall.scale.set(1, floorHeight, buildingConfig.depth);
    leftWall.position.x = -buildingConfig.width / 2;
    leftWall.position.y = floorHeight / 2;
    leftWall.castShadow = true;
    leftWall.receiveShadow = true;
    floorGroup.add(leftWall);

    // Façade droite (vitrée) - utiliser PlaneGeometry pour les façades vitrées
    const rightFacadeGeometry = new THREE.PlaneGeometry(buildingConfig.depth, floorHeight);
    const rightFacade = new THREE.Mesh(rightFacadeGeometry, materials.glass);
    rightFacade.position.set(buildingConfig.width / 2, floorHeight / 2, 0);
    rightFacade.rotation.y = Math.PI / 2; // Face outward (+x)
    rightFacade.castShadow = false;
    rightFacade.receiveShadow = true;
    floorGroup.add(rightFacade);

    // Façade principale
    const frontFacadeGeometry = new THREE.PlaneGeometry(buildingConfig.width, floorHeight);
    const frontFacade = new THREE.Mesh(frontFacadeGeometry, materials.glass);
    frontFacade.position.z = buildingConfig.depth / 2;
    frontFacade.position.y = floorHeight / 2;
    frontFacade.receiveShadow = true;
    floorGroup.add(frontFacade);
}

// Garages - utiliser une géométrie partagée
const garageGeometry = new THREE.BoxGeometry(1, 1, 1);

function createGarages(floorGroup) {
    const garageWidth = buildingConfig.width / buildingConfig.officeCount;
    const garageDepth = buildingConfig.depth * 0.8;
    const garageHeight = buildingConfig.rdcHeight * 0.8;

    for (let i = 0; i < buildingConfig.officeCount; i++) {
        const garage = new THREE.Mesh(garageGeometry.clone(), materials.garages);
        garage.scale.set(garageWidth - 0.5, garageHeight, garageDepth);
        const xPos = (i - (buildingConfig.officeCount - 1) / 2) * garageWidth;
        garage.position.set(xPos, garageHeight / 2, (buildingConfig.depth - garageDepth) / 2);
        garage.castShadow = true;
        garage.receiveShadow = true;
        floorGroup.add(garage);
    }
}

// Entrées
function createEntrances(floorGroup) {
    // Entrée N°1 (façade droite)
    const entrance1 = new THREE.Mesh(garageGeometry.clone(), materials.entrances);
    entrance1.scale.set(1, buildingConfig.rdcHeight * 0.9, 3);
    entrance1.position.set(buildingConfig.width / 2 + 0.2, (buildingConfig.rdcHeight * 0.9) / 2, -2.8);
    entrance1.castShadow = true;
    entrance1.receiveShadow = true;
    floorGroup.add(entrance1);

    // Entrée N°2 (façade principale)
    const entrance2 = new THREE.Mesh(garageGeometry.clone(), materials.entrances);
    entrance2.scale.set(1, buildingConfig.rdcHeight * 0.9, 3);
    entrance2.position.set(0, (buildingConfig.rdcHeight * 0.9) / 2, buildingConfig.depth / 2);
    entrance2.castShadow = true;
    entrance2.receiveShadow = true;
    floorGroup.add(entrance2);
}

// Bureaux - utiliser la même géométrie de base que pour les garages
function createOffices(floorGroup) {
    const officeWidth = buildingConfig.width / buildingConfig.officeCount;
    const officeDepth = buildingConfig.depth * 0.5;
    const officeHeight = buildingConfig.floorHeight * 0.8;

    for (let i = 0; i < buildingConfig.officeCount; i++) {
        const office = new THREE.Mesh(garageGeometry.clone(), materials.offices);
        office.scale.set(officeWidth - 0.5, officeHeight, officeDepth);
        const xPos = (i - (buildingConfig.officeCount - 1) / 2) * officeWidth;
        office.position.set(xPos, officeHeight / 2, (buildingConfig.depth - officeDepth) / 2);
        office.castShadow = true;
        office.receiveShadow = true;
        floorGroup.add(office);
    }
}

// Couloir
function createCorridor(floorGroup) {
    const corridorWidth = buildingConfig.width;
    const corridorDepth = buildingConfig.depth * 0.3;
    const corridorHeight = buildingConfig.floorHeight * 0.8;

    const corridor = new THREE.Mesh(garageGeometry.clone(), materials.structure);
    corridor.scale.set(corridorWidth, corridorHeight, corridorDepth);
    corridor.position.set(0, corridorHeight / 2, -buildingConfig.depth / 2 + corridorDepth / 2);
    corridor.castShadow = true;
    corridor.receiveShadow = true;
    floorGroup.add(corridor);
}

// Escaliers et ascenseurs
function createElevatorStairs(floorGroup) {
    const isRDC = floorGroup.userData.floorNumber === 0;
    const height = isRDC ? buildingConfig.rdcHeight : buildingConfig.floorHeight;

    const elevator1 = new THREE.Mesh(garageGeometry.clone(), materials.elevatorStairs);
    elevator1.scale.set(5, height * 0.9, 3);
    elevator1.position.set(-(buildingConfig.width / 2) + 5, (height * 0.9) / 2, -buildingConfig.depth / 2 + 3);
    elevator1.castShadow = true;
    elevator1.receiveShadow = true;
    floorGroup.add(elevator1);

    const elevator2 = new THREE.Mesh(garageGeometry.clone(), materials.elevatorStairs);
    elevator2.scale.set(5, height * 0.9, 3);
    elevator2.position.set(5, (height * 0.9) / 2, -buildingConfig.depth / 2 + 3);
    elevator2.castShadow = true;
    elevator2.receiveShadow = true;
    floorGroup.add(elevator2);
}

// Vue 2D
function set2DView() {
    camera.position.set(0, 100, 0);
    camera.lookAt(0, 0, 0);
    controls.enabled = false;
    isViewMode2D = true;
    building.rotation.y = 0;
    document.getElementById('viewpoint-selector').style.display = 'none';
}

// Vue 3D
function set3DView() {
    camera.position.set(50, 40, 50);
    camera.lookAt(0, 10, 0);
    controls.enabled = true;
    isViewMode2D = false;
    document.getElementById('viewpoint-selector').style.display = 'none';
}

// Redimensionnement
// Suite de app.js

function onWindowResize() {
    const container = document.getElementById('scene-container');
    if (!container) return;
    
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

// Configuration des écouteurs d'événements
function setupEventListeners() {
    // Boutons de vue 2D/3D
    document.getElementById('view2DBtn').addEventListener('click', () => {
        set2DView();
        document.getElementById('view2DBtn').classList.add('active');
        document.getElementById('view3DBtn').classList.remove('active');
    });
    
    document.getElementById('view3DBtn').addEventListener('click', () => {
        set3DView();
        document.getElementById('view3DBtn').classList.add('active');
        document.getElementById('view2DBtn').classList.remove('active');
    });
    
    // Boutons de contrôle de vue
    document.getElementById('resetViewBtn').addEventListener('click', () => {
        if (isViewMode2D) {
            set2DView();
        } else {
            set3DView();
        }
    });
    
    document.getElementById('zoomInBtn').addEventListener('click', () => {
        camera.fov = Math.max(10, camera.fov - 5);
        camera.updateProjectionMatrix();
    });
    
    document.getElementById('zoomOutBtn').addEventListener('click', () => {
        camera.fov = Math.min(100, camera.fov + 5);
        camera.updateProjectionMatrix();
    });
    
    document.getElementById('toggleWireframeBtn').addEventListener('click', toggleWireframe);
    
    // Sélecteur d'étage
    const floorButtons = document.querySelectorAll('.floor-selector button');
    floorButtons.forEach(button => {
        button.addEventListener('click', () => {
            const floor = button.dataset.floor;
            showFloor(floor);
            
            // Mettre à jour l'état actif des boutons
            floorButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Mettre à jour le sélecteur de point de vue si en mode 3D
            if (!isViewMode2D) {
                updateViewpointSelector(floor);
            }
        });
    });
}

// Basculer entre le mode filaire et normal
function toggleWireframe() {
    isWireframe = !isWireframe;
    
    // Parcourir tous les objets de la scène
    building.traverse(child => {
        if (child instanceof THREE.Mesh) {
            if (isWireframe) {
                // Sauvegarder le matériau original
                child.userData.originalMaterial = child.material;
                // Appliquer le matériau filaire
                child.material = materials.wireframe;
            } else {
                // Restaurer le matériau original s'il existe
                if (child.userData.originalMaterial) {
                    child.material = child.userData.originalMaterial;
                }
            }
        }
    });
}

// Afficher/masquer les étages
function showFloor(floor) {
    if (floor === 'all') {
        floors.forEach(f => f.visible = true);
        return;
    }
    
    const floorNum = parseInt(floor);
    floors.forEach((f, index) => {
        f.visible = (index === floorNum);
    });
    
    // Si en mode 3D, mettre à jour le sélecteur de point de vue
    if (!isViewMode2D) {
        updateViewpointSelector(floorNum);
    }
}

// Mettre à jour le sélecteur de point de vue
function updateViewpointSelector(floor) {
    const selector = document.getElementById('viewpoint-selector');
    const buttonsContainer = document.getElementById('viewpoint-buttons');
    
    if (floor === 'all' || isViewMode2D) {
        selector.style.display = 'none';
        return;
    }
    
    selector.style.display = 'block';
    buttonsContainer.innerHTML = '';
    
    const floorNum = parseInt(floor);
    viewpoints[floorNum].forEach((viewpoint, index) => {
        const button = document.createElement('button');
        button.textContent = viewpoint.name;
        button.addEventListener('click', () => {
            moveCameraToViewpoint(viewpoint);
        });
        buttonsContainer.appendChild(button);
    });
}

// Déplacer la caméra vers un point de vue spécifique
function moveCameraToViewpoint(viewpoint) {
    new TWEEN.Tween(camera.position)
        .to({ 
            x: viewpoint.position[0], 
            y: viewpoint.position[1], 
            z: viewpoint.position[2] 
        }, 1000)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .start();
    
    new TWEEN.Tween(controls.target)
        .to({ 
            x: viewpoint.target[0], 
            y: viewpoint.target[1], 
            z: viewpoint.target[2] 
        }, 1000)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .start();
}

// Animation
function animate() {
    requestAnimationFrame(animate);
    TWEEN.update();
    controls.update();
    renderer.render(scene, camera);
}

// Initialiser l'application
init();