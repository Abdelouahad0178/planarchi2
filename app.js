import * as THREE from 'https://esm.sh/three@0.158.0';
import { OrbitControls } from 'https://esm.sh/three@0.158.0/examples/jsm/controls/OrbitControls.js';
import * as TWEEN from 'https://esm.sh/@tweenjs/tween.js@18.6.4';

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

// Matériaux
const materials = {
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

// Points de vue intérieurs pour chaque étage
const viewpoints = [];
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

// Initialisation
function init() {
    if (!Detector.webgl) {
        document.getElementById('error-message').textContent = 'WebGL n\'est pas supporté par votre navigateur. Veuillez utiliser un navigateur moderne comme Chrome ou Firefox.';
        document.getElementById('error-message').style.display = 'block';
        document.getElementById('loading-overlay').style.display = 'none';
        return;
    }

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);

    const container = document.getElementById('scene-container');
    camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 1000);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

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

// Structure de l'étage
function createFloorStructure(floorGroup, floorHeight) {
    // Plancher
    const floorGeometry = new THREE.BoxGeometry(buildingConfig.width, 0.2, buildingConfig.depth);
    const floor = new THREE.Mesh(floorGeometry, materials.structure);
    floor.position.y = -0.1;
    floor.receiveShadow = true;
    floorGroup.add(floor);

    // Plafond
    const ceilingGeometry = new THREE.BoxGeometry(buildingConfig.width, 0.2, buildingConfig.depth);
    const ceiling = new THREE.Mesh(ceilingGeometry, materials.structure);
    ceiling.position.y = floorHeight - 0.1;
    ceiling.receiveShadow = true;
    floorGroup.add(ceiling);

    // Mur arrière
    const backWallGeometry = new THREE.BoxGeometry(buildingConfig.width, floorHeight, 0.2);
    const backWall = new THREE.Mesh(backWallGeometry, materials.structure);
    backWall.position.z = -buildingConfig.depth / 2;
    backWall.position.y = floorHeight / 2;
    backWall.castShadow = true;
    backWall.receiveShadow = true;
    floorGroup.add(backWall);

    // Mur gauche (solide)
    const sideWallGeometry = new THREE.BoxGeometry(0.2, floorHeight, buildingConfig.depth);
    const leftWall = new THREE.Mesh(sideWallGeometry, materials.structure);
    leftWall.position.x = -buildingConfig.width / 2;
    leftWall.position.y = floorHeight / 2;
    leftWall.castShadow = true;
    leftWall.receiveShadow = true;
    floorGroup.add(leftWall);

    // Façade droite (vitrée)
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

// Garages
function createGarages(floorGroup) {
    const garageWidth = buildingConfig.width / buildingConfig.officeCount;
    const garageDepth = buildingConfig.depth * 0.8;
    const garageHeight = buildingConfig.rdcHeight * 0.8;

    for (let i = 0; i < buildingConfig.officeCount; i++) {
        const garageGeometry = new THREE.BoxGeometry(garageWidth - 0.5, garageHeight, garageDepth);
        const garage = new THREE.Mesh(garageGeometry, materials.garages);
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
    const entrance1Geometry = new THREE.BoxGeometry(1, buildingConfig.rdcHeight * 0.9, 3);
    const entrance1 = new THREE.Mesh(entrance1Geometry, materials.entrances);
    entrance1.position.set(buildingConfig.width / 2 + 0.2, (buildingConfig.rdcHeight * 0.9) / 2, -2.8);
    entrance1.castShadow = true;
    entrance1.receiveShadow = true;
    floorGroup.add(entrance1);

    // Entrée N°2 (façade principale)
    const entrance2Geometry = new THREE.BoxGeometry(1, buildingConfig.rdcHeight * 0.9, 3);
    const entrance2 = new THREE.Mesh(entrance2Geometry, materials.entrances);
    entrance2.position.set(0, (buildingConfig.rdcHeight * 0.9) / 2, buildingConfig.depth / 2);
    entrance2.castShadow = true;
    entrance2.receiveShadow = true;
    floorGroup.add(entrance2);
}

// Bureaux
function createOffices(floorGroup) {
    const officeWidth = buildingConfig.width / buildingConfig.officeCount;
    const officeDepth = buildingConfig.depth * 0.5;
    const officeHeight = buildingConfig.floorHeight * 0.8;

    for (let i = 0; i < buildingConfig.officeCount; i++) {
        const officeGeometry = new THREE.BoxGeometry(officeWidth - 0.5, officeHeight, officeDepth);
        const office = new THREE.Mesh(officeGeometry, materials.offices);
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

    const corridorGeometry = new THREE.BoxGeometry(corridorWidth, corridorHeight, corridorDepth);
    const corridor = new THREE.Mesh(corridorGeometry, materials.structure);
    corridor.position.set(0, corridorHeight / 2, -buildingConfig.depth / 2 + corridorDepth / 2);
    corridor.castShadow = true;
    corridor.receiveShadow = true;
    floorGroup.add(corridor);
}

// Escaliers et ascenseurs
function createElevatorStairs(floorGroup) {
    const isRDC = floorGroup.userData.floorNumber === 0;
    const height = isRDC ? buildingConfig.rdcHeight : buildingConfig.floorHeight;

    const elevator1Geometry = new THREE.BoxGeometry(5, height * 0.9, 3);
    const elevator1 = new THREE.Mesh(elevator1Geometry, materials.elevatorStairs);
    elevator1.position.set(-(buildingConfig.width / 2) + 5, (height * 0.9) / 2, -buildingConfig.depth / 2 + 3);
    elevator1.castShadow = true;
    elevator1.receiveShadow = true;
    floorGroup.add(elevator1);

    const elevator2Geometry = new THREE.BoxGeometry(5, height * 0.9, 3);
    const elevator2 = new THREE.Mesh(elevator2Geometry, materials.elevatorStairs);
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
function onWindowResize() {
    const container = document.getElementById('scene-container');
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

// Événements
function setupEventListeners() {
    document.getElementById('view2DBtn').addEventListener('click', () => {
        set2DView();
        document.getElementById('view2DBtn').classList.add('active');
        document.getElementById('view3DBtn').classList.remove('active');
        document.getElementById('viewpoint-selector').style.display = 'none';
    });

    document.getElementById('view3DBtn').addEventListener('click', () => {
        set3DView();
        document.getElementById('view3DBtn').classList.add('active');
        document.getElementById('view2DBtn').classList.remove('active');
        document.getElementById('viewpoint-selector').style.display = 'none';
    });

    document.getElementById('resetViewBtn').addEventListener('click', () => {
        isViewMode2D ? set2DView() : set3DView();
        document.getElementById('viewpoint-selector').style.display = 'none';
    });

    document.getElementById('zoomInBtn').addEventListener('click', () => {
        camera.position.multiplyScalar(0.9);
        camera.updateProjectionMatrix();
    });

    document.getElementById('zoomOutBtn').addEventListener('click', () => {
        camera.position.multiplyScalar(1.1);
        camera.updateProjectionMatrix();
    });

    document.getElementById('toggleWireframeBtn').addEventListener('click', toggleWireframe);

    const floorButtons = document.querySelectorAll('.floor-selector button');
    floorButtons.forEach(button => {
        button.addEventListener('click', function() {
            const selectedFloor = this.dataset.floor;
            floorButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');

            floors.forEach((floor, index) => {
                floor.visible = selectedFloor === 'all' || index === parseInt(selectedFloor);
                floor.scale.set(1, selectedFloor === 'all' ? 1 : 0.01, 1);
                new TWEEN.Tween(floor.scale)
                    .to({ x: 1, y: 1, z: 1 }, 500)
                    .easing(TWEEN.Easing.Quadratic.InOut)
                    .start();
            });

            if (selectedFloor === 'all') {
                document.getElementById('viewpoint-selector').style.display = 'none';
            } else {
                showViewpointsForFloor(parseInt(selectedFloor));
            }
        });
    });
}

// Afficher les points de vue pour un étage sélectionné
function showViewpointsForFloor(floorNumber) {
    const viewpointButtonsDiv = document.getElementById('viewpoint-buttons');
    viewpointButtonsDiv.innerHTML = '';

    const floorViewpoints = viewpoints[floorNumber];
    if (floorViewpoints) {
        floorViewpoints.forEach((vp) => {
            const btn = document.createElement('button');
            btn.textContent = vp.name;
            btn.style.margin = '5px';
            btn.style.padding = '5px';
            btn.style.cursor = 'pointer';
            btn.addEventListener('click', () => moveCameraTo(vp.position, vp.target));
            viewpointButtonsDiv.appendChild(btn);
        });
        document.getElementById('viewpoint-selector').style.display = 'block';
    } else {
        document.getElementById('viewpoint-selector').style.display = 'none';
    }
}

// Déplacer la caméra vers un point de vue spécifique
function moveCameraTo(newPosition, newTarget) {
    controls.enabled = false;
    const duration = 1000;
    new TWEEN.Tween(camera.position)
        .to(new THREE.Vector3(...newPosition), duration)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .start();
    new TWEEN.Tween(controls.target)
        .to(new THREE.Vector3(...newTarget), duration)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .onComplete(() => {
            controls.update();
            controls.enabled = true;
        })
        .start();
}

// Wireframe
function toggleWireframe() {
    isWireframe = !isWireframe;
    scene.traverse(object => {
        if (object.isMesh) {
            if (isWireframe) {
                object.userData.originalMaterial = object.material;
                object.material = materials.wireframe;
            } else if (object.userData.originalMaterial) {
                object.material = object.userData.originalMaterial;
            }
        }
    });
}

// Animation
function animate() {
    requestAnimationFrame(animate);
    TWEEN.update();
    controls.update();
    renderer.render(scene, camera);
}

// Détecteur WebGL
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

init();