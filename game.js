// Game variables
let scene, camera, engine, player, enemies = [];
let score = 0;
let playerSword = null;

// Initialize game
function initGame() {
    const canvas = document.getElementById('gameCanvas');
    engine = new BABYLON.Engine(canvas, true);
    
    // Create scene
    scene = new BABYLON.Scene(engine);
    scene.collisionsEnabled = true;
    scene.gravity = new BABYLON.Vector3(0, -0.9, 0);
    
    // Create camera (first person view)
    camera = new BABYLON.UniversalCamera('camera', new BABYLON.Vector3(0, 2, 0));
    camera.attachControl(canvas, true);
    camera.speed = 0.3;
    camera.angularSensibility = 1000;
    camera.inertia = 0.7;
    camera.checkCollisions = true;
    camera.collisionRadius = new BABYLON.Vector3(0.5, 0.5, 0.5);
    
    // Lighting
    const light1 = new BABYLON.HemisphericLight('light1', new BABYLON.Vector3(1, 1, 0));
    light1.intensity = 0.7;
    
    const light2 = new BABYLON.PointLight('light2', new BABYLON.Vector3(0, 5, 0));
    light2.intensity = 0.8;
    light2.range = 50;
    
    // Create GREEN GROUND
    const ground = BABYLON.MeshBuilder.CreateGround('ground', { width: 200, height: 200 }, scene);
    const groundMaterial = new BABYLON.StandardMaterial('groundMat', scene);
    groundMaterial.diffuse = new BABYLON.Color3(0, 1, 0); // Bright green
    ground.material = groundMaterial;
    ground.checkCollisions = true;
    
    // Create sky
    const sky = BABYLON.MeshBuilder.CreateBox('sky', { size: 500 }, scene);
    const skyMaterial = new BABYLON.StandardMaterial('skyMat', scene);
    skyMaterial.emissiveColor = new BABYLON.Color3(0.5, 0.7, 1);
    sky.material = skyMaterial;
    
    // Create PLAYER TRIANGLE
    createPlayerTriangle();
    
    // Create SWORD in player's hand
    createSword();
    
    // Spawn initial enemies
    spawnEnemy(10, 5, 'goblin');
    spawnEnemy(-15, 8, 'troll');
    spawnEnemy(0, 10, 'cyclops');
    
    // Setup mobile controls
    setupMobileControls();
    
    // Mouse click for attack
    window.addEventListener('click', () => {
        attack();
    });
    
    // Keyboard input
    scene.onKeyboardObservable.add((kbInfo) => {
        const key = kbInfo.event.key.toLowerCase();
        if (kbInfo.type === BABYLON.KeyboardEventTypes.KEYDOWN) {
            if (key === 'w') camera.position.z -= 0.3;
            if (key === 'a') camera.position.x -= 0.3;
            if (key === 's') camera.position.z += 0.3;
            if (key === 'd') camera.position.x += 0.3;
            if (key === ' ') {
                attack();
            }
        }
    });
    
    // Game loop
    engine.runRenderLoop(() => {
        updateGame();
        scene.render();
    });
    
    window.addEventListener('resize', () => {
        engine.resize();
    });
}

function createPlayerTriangle() {
    // Create a triangle shape for the player
    const vertices = [];
    const indices = [];
    
    // Triangle vertices
    vertices.push(-1, 0, 0);    // Left point
    vertices.push(1, 0, 0);     // Right point
    vertices.push(0, 2, 0);     // Top point
    vertices.push(-1, 0, -1);   // Left back
    vertices.push(1, 0, -1);    // Right back
    vertices.push(0, 2, -1);    // Top back
    
    // Front face
    indices.push(0, 2, 1);
    // Back face
    indices.push(3, 4, 5);
    // Left face
    indices.push(0, 5, 2);
    indices.push(0, 3, 5);
    // Right face
    indices.push(1, 2, 5);
    indices.push(1, 5, 4);
    // Bottom face
    indices.push(0, 1, 4);
    indices.push(0, 4, 3);
    
    // Create mesh
    const triangle = new BABYLON.Mesh('playerTriangle', scene);
    
    const vertexData = new BABYLON.VertexData();
    vertexData.positions = vertices;
    vertexData.indices = indices;
    vertexData.computeNormals();
    vertexData.applyToMesh(triangle);
    
    // Material
    const triangleMat = new BABYLON.StandardMaterial('triangleMat', scene);
    triangleMat.diffuse = new BABYLON.Color3(1, 0, 0); // Red player
    triangle.material = triangleMat;
    
    // Position player
    triangle.position = new BABYLON.Vector3(0, 1, 0);
    triangle.scaling = new BABYLON.Vector3(0.5, 0.5, 0.5);
    
    player = triangle;
}

function createSword() {
    // Create a sword (rectangular blade + handle)
    
    // Blade
    const blade = BABYLON.MeshBuilder.CreateBox('sword_blade', { width: 0.3, height: 2, depth: 0.05 }, scene);
    const bladeMat = new BABYLON.StandardMaterial('bladeMat', scene);
    bladeMat.diffuse = new BABYLON.Color3(0.7, 0.7, 0.7); // Silver
    blade.material = bladeMat;
    blade.position = new BABYLON.Vector3(0.5, 1.5, -0.5);
    
    // Handle
    const handle = BABYLON.MeshBuilder.CreateCylinder('sword_handle', { diameter: 0.2, height: 0.5 }, scene);
    const handleMat = new BABYLON.StandardMaterial('handleMat', scene);
    handleMat.diffuse = new BABYLON.Color3(0.6, 0.3, 0); // Brown
    handle.material = handleMat;
    handle.position = new BABYLON.Vector3(0.5, 0.5, -0.5);
    
    // Guard
    const guard = BABYLON.MeshBuilder.CreateBox('sword_guard', { width: 0.8, height: 0.1, depth: 0.1 }, scene);
    const guardMat = new BABYLON.StandardMaterial('guardMat', scene);
    guardMat.diffuse = new BABYLON.Color3(1, 0.84, 0); // Gold
    guard.material = guardMat;
    guard.position = new BABYLON.Vector3(0.5, 0.8, -0.5);
    
    // Group sword parts
    playerSword = {
        blade: blade,
        handle: handle,
        guard: guard
    };
}

function spawnEnemy(x, z, type) {
    if (enemies.length > 15) return;
    
    let enemy = {
        mesh: BABYLON.MeshBuilder.CreateBox(`enemy_${enemies.length}`, { size: 1 }, scene),
        position: new BABYLON.Vector3(x, 1, z),
        type: type,
        health: 0,
        maxHealth: 0,
        speed: 0,
        damage: 0,
        points: 0
    };
    
    // Set type-specific properties
    if (type === 'goblin') {
        enemy.health = 30;
        enemy.maxHealth = 30;
        enemy.speed = 0.15;
        enemy.damage = 0;
        enemy.points = 10;
        enemy.mesh.material = new BABYLON.StandardMaterial('goblinMat', scene);
        enemy.mesh.material.diffuse = new BABYLON.Color3(0.2, 0.8, 0.2);
        enemy.mesh.scaling = new BABYLON.Vector3(0.6, 0.8, 0.6);
    } else if (type === 'troll') {
        enemy.health = 60;
        enemy.maxHealth = 60;
        enemy.speed = 0.08;
        enemy.damage = 0;
        enemy.points = 30;
        enemy.mesh.material = new BABYLON.StandardMaterial('trollMat', scene);
        enemy.mesh.material.diffuse = new BABYLON.Color3(0.7, 0.5, 0.2);
        enemy.mesh.scaling = new BABYLON.Vector3(1.5, 1.5, 1.5);
    } else if (type === 'cyclops') {
        enemy.health = 80;
        enemy.maxHealth = 80;
        enemy.speed = 0.1;
        enemy.damage = 0;
        enemy.points = 50;
        enemy.mesh.material = new BABYLON.StandardMaterial('cyclopsMat', scene);
        enemy.mesh.material.diffuse = new BABYLON.Color3(1, 0.2, 0.2);
        enemy.mesh.scaling = new BABYLON.Vector3(2, 2, 2);
    }
    
    enemy.mesh.position = enemy.position;
    enemy.mesh.checkCollisions = true;
    enemies.push(enemy);
}

function attack() {
    // Swing sword animation
    const attackRange = 15;
    
    // Sword swing animation
    const originalPosition = playerSword.blade.position.clone();
    const swingDuration = 300; // milliseconds
    const startTime = Date.now();
    
    // Attack enemies
    enemies.forEach(enemy => {
        const distance = BABYLON.Vector3.Distance(camera.position, enemy.mesh.position);
        if (distance < attackRange) {
            enemy.health -= 25;
            if (enemy.health <= 0) {
                score += enemy.points;
                updateScore();
                removeEnemy(enemies.indexOf(enemy));
                
                // Spawn new enemy
                const randomX = (Math.random() - 0.5) * 60;
                const randomZ = (Math.random() - 0.5) * 60 + 20;
                const randomType = ['goblin', 'troll', 'cyclops'][Math.floor(Math.random() * 3)];
                spawnEnemy(randomX, randomZ, randomType);
            }
        }
    });
    
    // Animate sword swing
    const swingInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = elapsed / swingDuration;
        
        if (progress >= 1) {
            clearInterval(swingInterval);
            playerSword.blade.position = originalPosition.clone();
        } else {
            // Swing animation
            const swingAmount = Math.sin(progress * Math.PI) * 0.5;
            playerSword.blade.rotation.z = swingAmount;
        }
    }, 16);
}

function removeEnemy(index) {
    if (enemies[index]) {
        enemies[index].mesh.dispose();
        enemies.splice(index, 1);
    }
}

function updateGame() {
    // Update enemies
    enemies.forEach(enemy => {
        // Move towards camera
        const direction = camera.position.subtract(enemy.mesh.position).normalize();
        enemy.mesh.position.addInPlace(direction.scale(enemy.speed));
        
        // Remove if too far
        const distance = BABYLON.Vector3.Distance(enemy.mesh.position, camera.position);
        if (distance > 100) {
            removeEnemy(enemies.indexOf(enemy));
        }
    });
    
    // Update sword position to follow camera (in hand)
    if (playerSword) {
        playerSword.blade.position = camera.position.add(new BABYLON.Vector3(0.5, -1.5, -0.5));
        playerSword.handle.position = camera.position.add(new BABYLON.Vector3(0.5, -2.5, -0.5));
        playerSword.guard.position = camera.position.add(new BABYLON.Vector3(0.5, -2.2, -0.5));
    }
}

function updateScore() {
    document.getElementById('score').textContent = `Score: ${score}`;
}

function setupMobileControls() {
    const upBtn = document.getElementById('upBtn');
    const downBtn = document.getElementById('downBtn');
    const leftBtn = document.getElementById('leftBtn');
    const rightBtn = document.getElementById('rightBtn');
    const attackBtn = document.getElementById('attackBtn');
    
    const moveDistance = 0.5;
    
    upBtn.addEventListener('touchstart', (e) => { e.preventDefault(); camera.position.z -= moveDistance; });
    downBtn.addEventListener('touchstart', (e) => { e.preventDefault(); camera.position.z += moveDistance; });
    leftBtn.addEventListener('touchstart', (e) => { e.preventDefault(); camera.position.x -= moveDistance; });
    rightBtn.addEventListener('touchstart', (e) => { e.preventDefault(); camera.position.x += moveDistance; });
    attackBtn.addEventListener('touchstart', (e) => { e.preventDefault(); attack(); });
}

// Restart button
document.getElementById('restartBtn').addEventListener('click', () => {
    location.reload();
});

// Initialize on load
window.addEventListener('load', initGame);
