// Game variables
let scene, camera, engine, player, enemies = [], projectiles = [];
let playerHealth = 100, maxHealth = 100;
let score = 0;
let gameOverFlag = false;
let lastAttackTime = 0;
let attackCooldown = 300; // milliseconds

// Mobile controls
const mobileKeys = {
    w: false,
    a: false,
    s: false,
    d: false
};

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
    
    // Create ground
    const ground = BABYLON.MeshBuilder.CreateGround('ground', { width: 200, height: 200 }, scene);
    const groundMaterial = new BABYLON.StandardMaterial('groundMat', scene);
    groundMaterial.diffuse = new BABYLON.Color3(0.2, 0.8, 0.2);
    ground.material = groundMaterial;
    ground.checkCollisions = true;
    
    // Create sky
    const sky = BABYLON.MeshBuilder.CreateBox('sky', { size: 500 }, scene);
    const skyMaterial = new BABYLON.StandardMaterial('skyMat', scene);
    skyMaterial.emissiveColor = new BABYLON.Color3(0.5, 0.7, 1);
    sky.material = skyMaterial;
    
    // Create some obstacles
    createObstacles();
    
    // Spawn initial enemies
    spawnEnemy(10, 5, 'goblin');
    spawnEnemy(-15, 8, 'troll');
    spawnEnemy(0, 10, 'cyclops');
    
    // Setup mobile controls
    setupMobileControls();
    
    // Mouse click for attack
    window.addEventListener('click', () => {
        if (!gameOverFlag) attack();
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
                if (!gameOverFlag) attack();
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

function createObstacles() {
    const positions = [
        { x: 20, z: 20 },
        { x: -20, z: 20 },
        { x: 20, z: -20 },
        { x: -20, z: -20 },
        { x: 0, z: 30 },
        { x: 30, z: 0 }
    ];
    
    positions.forEach(pos => {
        const obstacle = BABYLON.MeshBuilder.CreateBox('obstacle', { size: 5 }, scene);
        obstacle.position = new BABYLON.Vector3(pos.x, 2.5, pos.z);
        const obstacleMat = new BABYLON.StandardMaterial('obstacleMat', scene);
        obstacleMat.diffuse = new BABYLON.Color3(0.6, 0.6, 0.6);
        obstacle.material = obstacleMat;
        obstacle.checkCollisions = true;
    });
}

function spawnEnemy(x, z, type) {
    if (enemies.length > 15) return; // Limit enemies
    
    let enemy = {
        mesh: BABYLON.MeshBuilder.CreateBox(`enemy_${enemies.length}`, { size: 1 }, scene),
        position: new BABYLON.Vector3(x, 1, z),
        type: type,
        health: 0,
        maxHealth: 0,
        speed: 0,
        damage: 0,
        points: 0,
        lastAttackTime: 0,
        attackCooldown: 1000
    };
    
    // Set type-specific properties
    if (type === 'goblin') {
        enemy.health = 30;
        enemy.maxHealth = 30;
        enemy.speed = 0.15;
        enemy.damage = 10;
        enemy.points = 10;
        enemy.mesh.material = new BABYLON.StandardMaterial('goblinMat', scene);
        enemy.mesh.material.diffuse = new BABYLON.Color3(0.2, 0.8, 0.2);
        enemy.mesh.scaling = new BABYLON.Vector3(0.6, 0.8, 0.6);
    } else if (type === 'troll') {
        enemy.health = 60;
        enemy.maxHealth = 60;
        enemy.speed = 0.08;
        enemy.damage = 20;
        enemy.points = 30;
        enemy.mesh.material = new BABYLON.StandardMaterial('trollMat', scene);
        enemy.mesh.material.diffuse = new BABYLON.Color3(0.7, 0.5, 0.2);
        enemy.mesh.scaling = new BABYLON.Vector3(1.5, 1.5, 1.5);
    } else if (type === 'cyclops') {
        enemy.health = 80;
        enemy.maxHealth = 80;
        enemy.speed = 0.1;
        enemy.damage = 30;
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
    const now = Date.now();
    if (now - lastAttackTime < attackCooldown) return;
    lastAttackTime = now;
    
    // Check enemies in front of camera
    const attackRange = 15;
    const cameraDirection = BABYLON.Vector3.Forward();
    const rotationMatrix = BABYLON.Matrix.RotationYawPitchRoll(camera.rotation.y, camera.rotation.x, camera.rotation.z);
    cameraDirection.applyInPlace(rotationMatrix);
    
    const attackOrigin = camera.position.add(cameraDirection.scale(2));
    
    enemies.forEach(enemy => {
        const distance = BABYLON.Vector3.Distance(attackOrigin, enemy.mesh.position);
        if (distance < attackRange) {
            const enemyDirection = enemy.mesh.position.subtract(attackOrigin);
            const angle = BABYLON.Vector3.Dot(cameraDirection, enemyDirection.normalize());
            
            if (angle > 0.5) { // Check if in front
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
        }
    });
}

function removeEnemy(index) {
    if (enemies[index]) {
        enemies[index].mesh.dispose();
        enemies.splice(index, 1);
    }
}

function updateGame() {
    if (gameOverFlag) return;
    
    // Update enemies
    enemies.forEach(enemy => {
        // Move towards camera
        const direction = camera.position.subtract(enemy.mesh.position).normalize();
        enemy.mesh.position.addInPlace(direction.scale(enemy.speed));
        
        // Check distance to camera for attack
        const distance = BABYLON.Vector3.Distance(enemy.mesh.position, camera.position);
        const now = Date.now();
        
        if (distance < 3) {
            if (now - enemy.lastAttackTime > enemy.attackCooldown) {
                playerHealth -= enemy.damage;
                enemy.lastAttackTime = now;
                updateHealth();
            }
        }
        
        // Remove if too far
        if (distance > 100) {
            removeEnemy(enemies.indexOf(enemy));
        }
    });
    
    // Check game over
    if (playerHealth <= 0) {
        gameOver();
    }
}

function updateScore() {
    document.getElementById('score').textContent = `Score: ${score}`;
}

function updateHealth() {
    const healthPercent = (playerHealth / maxHealth) * 100;
    document.getElementById('healthFill').style.width = healthPercent + '%';
    document.getElementById('health').textContent = `Health: ${playerHealth}/${maxHealth}`;
}

function gameOver() {
    gameOverFlag = true;
    document.getElementById('gameOverScore').textContent = `Final Score: ${score}`;
    document.getElementById('gameOver').style.display = 'block';
}

function restartGame() {
    // Reset variables
    playerHealth = maxHealth;
    score = 0;
    gameOverFlag = false;
    lastAttackTime = 0;
    
    // Remove all enemies
    enemies.forEach(enemy => enemy.mesh.dispose());
    enemies = [];
    
    // Reset camera
    camera.position = new BABYLON.Vector3(0, 2, 0);
    camera.rotation = BABYLON.Vector3.Zero();
    
    // Hide game over screen
    document.getElementById('gameOver').style.display = 'none';
    
    // Update UI
    updateScore();
    updateHealth();
    
    // Spawn new enemies
    spawnEnemy(10, 5, 'goblin');
    spawnEnemy(-15, 8, 'troll');
    spawnEnemy(0, 10, 'cyclops');
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
document.getElementById('restartBtn').addEventListener('click', restartGame);

// Initialize on load
window.addEventListener('load', initGame);
