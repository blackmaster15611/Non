// Game Setup
const canvas = document.getElementById("gameCanvas");
const engine = new BABYLON.Engine(canvas, true);

// Game Variables
let scene, camera, light;
let player = { position: new BABYLON.Vector3(0, 1, 0), health: 100, maxHealth: 100, score: 0, speed: 0.25 };
let enemies = [];
let keys = {};
let isAttacking = false;
let gameOver = false;

// Enemy Types
const enemyTypes = {
    goblin: { color: BABYLON.Color3.Green(), health: 30, speed: 0.15, damage: 5, scale: 0.8, points: 10 },
    troll: { color: BABYLON.Color3.FromHexString("#8B4513"), health: 60, speed: 0.1, damage: 15, scale: 1.2, points: 30 },
    cyclops: { color: BABYLON.Color3.Red(), health: 80, speed: 0.08, damage: 20, scale: 1.5, points: 50 }
};

// Initialize Scene
function createScene() {
    scene = new BABYLON.Scene(engine);
    scene.enablePhysics(new BABYLON.Vector3(0, -9.81, 0), new BABYLON.CannonJSPlugin());
    scene.collisionsEnabled = true;
    
    // Camera
    camera = new BABYLON.UniversalCamera("camera", player.position.add(new BABYLON.Vector3(0, 2, -5)));
    camera.attachControl(canvas, true);
    camera.speed = 0;
    camera.inertia = 0.7;
    camera.angularSensibility = 1000;
    camera.checkCollisions = true;
    camera.collisionRadius = new BABYLON.Vector3(0.2, 0.9, 0.2);
    
    // Lighting
    light = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(0, 1, 0), scene);
    light.intensity = 0.9;
    
    const sunLight = new BABYLON.PointLight("sunLight", new BABYLON.Vector3(0, 20, 0), scene);
    sunLight.intensity = 0.5;
    
    // Ground
    const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 200, height: 200 }, scene);
    const groundMat = new BABYLON.StandardMaterial("groundMat", scene);
    groundMat.diffuse = new BABYLON.Color3.Green();
    groundMat.specularColor = new BABYLON.Color3.Black();
    ground.material = groundMat;
    ground.checkCollisions = true;
    
    // Sky
    const skybox = BABYLON.MeshBuilder.CreateBox("skyBox", { size: 500.0 }, scene);
    const skyboxMat = new BABYLON.StandardMaterial("skyBox", scene);
    skyboxMat.backFaceCulling = false;
    skyboxMat.emissiveColor = new BABYLON.Color3.FromHexString("#87CEEB");
    skybox.material = skyboxMat;
    
    return scene;
}

// Create Enemy
function createEnemy(type) {
    const enemyData = enemyTypes[type];
    const enemy = {
        type: type,
        mesh: BABYLON.MeshBuilder.CreateBox(type + Math.random(), { size: 1 }, scene),
        health: enemyData.health,
        maxHealth: enemyData.health,
        speed: enemyData.speed,
        damage: enemyData.damage,
        points: enemyData.points,
        attackCooldown: 0
    };
    
    enemy.mesh.scaling = new BABYLON.Vector3(enemyData.scale, enemyData.scale * 1.3, enemyData.scale);
    enemy.mesh.position = new BABYLON.Vector3(
        (Math.random() - 0.5) * 80 + player.position.x,
        2,
        (Math.random() - 0.5) * 80 + player.position.z
    );
    
    const mat = new BABYLON.StandardMaterial("enemyMat" + Math.random(), scene);
    mat.diffuse = enemyData.color;
    mat.specularColor = new BABYLON.Color3.Black();
    enemy.mesh.material = mat;
    enemy.mesh.checkCollisions = true;
    
    // Physics
    enemy.mesh.physicsImpostor = new BABYLON.PhysicsImpostor(
        enemy.mesh,
        BABYLON.PhysicsImpostor.BoxImpostor,
        { mass: 1, restitution: 0.2, friction: 1 },
        scene
    );
    
    enemies.push(enemy);
    return enemy;
}

// Update Player Camera
function updateCamera() {
    const forward = BABYLON.Vector3.Forward();
    const right = BABYLON.Vector3.Right();
    const speed = player.speed;
    
    if (keys['w'] || keys['W']) player.position.addInPlace(forward.scale(speed));
    if (keys['s'] || keys['S']) player.position.addInPlace(forward.scale(-speed));
    if (keys['a'] || keys['A']) player.position.addInPlace(right.scale(-speed));
    if (keys['d'] || keys['D']) player.position.addInPlace(right.scale(speed));
    
    camera.position = player.position.add(new BABYLON.Vector3(0, 2, -5));
}

// Attack
function attack() {
    if (isAttacking || gameOver) return;
    isAttacking = true;
    
    const attackRange = 15;
    const attackDamage = 25;
    
    enemies.forEach(enemy => {
        const distance = BABYLON.Vector3.Distance(player.position, enemy.mesh.position);
        if (distance < attackRange) {
            enemy.health -= attackDamage;
            if (enemy.health <= 0) {
                player.score += enemy.points;
                enemy.mesh.dispose();
                enemies = enemies.filter(e => e !== enemy);
            }
        }
    });
    
    setTimeout(() => { isAttacking = false; }, 500);
}

// Enemy AI
function updateEnemies() {
    enemies.forEach(enemy => {
        const distance = BABYLON.Vector3.Distance(player.position, enemy.mesh.position);
        const direction = player.position.subtract(enemy.mesh.position).normalize();
        
        if (distance > 1.5) {
            enemy.mesh.physicsImpostor.applyForce(
                direction.scale(enemy.speed * 100),
                enemy.mesh.getAbsolutePosition()
            );
        } else if (enemy.attackCooldown <= 0) {
            player.health -= enemy.damage;
            enemy.attackCooldown = 60;
            if (player.health <= 0) {
                gameOver = true;
                showGameOver();
            }
        }
        
        if (enemy.attackCooldown > 0) enemy.attackCooldown--;
    });
}

// Spawn Enemies
function spawnEnemies() {
    if (gameOver) return;
    
    const types = Object.keys(enemyTypes);
    const randomType = types[Math.floor(Math.random() * types.length)];
    
    createEnemy(randomType);
    
    if (enemies.length < 3 + Math.floor(player.score / 100)) {
        setTimeout(spawnEnemies, 3000);
    } else {
        setTimeout(spawnEnemies, 5000);
    }
}

// Update UI
function updateUI() {
    document.getElementById("score").textContent = "Score: " + player.score;
    document.getElementById("health").textContent = "Health: " + Math.ceil(player.health);
    const healthPercent = (player.health / player.maxHealth) * 100;
    document.getElementById("healthFill").style.width = healthPercent + "%";
}

// Show Game Over
function showGameOver() {
    document.getElementById("gameOverScore").textContent = "Final Score: " + player.score;
    document.getElementById("gameOver").style.display = "block";
}

// Restart Game
function restartGame() {
    location.reload();
}

// Mobile Controls
function setupMobileControls() {
    document.getElementById("upBtn").addEventListener("touchstart", () => { keys['w'] = true; });
    document.getElementById("upBtn").addEventListener("touchend", () => { keys['w'] = false; });
    
    document.getElementById("downBtn").addEventListener("touchstart", () => { keys['s'] = true; });
    document.getElementById("downBtn").addEventListener("touchend", () => { keys['s'] = false; });
    
    document.getElementById("leftBtn").addEventListener("touchstart", () => { keys['a'] = true; });
    document.getElementById("leftBtn").addEventListener("touchend", () => { keys['a'] = false; });
    
    document.getElementById("rightBtn").addEventListener("touchstart", () => { keys['d'] = true; });
    document.getElementById("rightBtn").addEventListener("touchend", () => { keys['d'] = false; });
    
    document.getElementById("attackBtn").addEventListener("touchstart", (e) => { e.preventDefault(); attack(); });
}

// Keyboard Controls
window.addEventListener("keydown", (e) => { keys[e.key] = true; });
window.addEventListener("keyup", (e) => { keys[e.key] = false; });

// Mouse Click to Attack
window.addEventListener("click", attack);

// Restart Button
document.getElementById("restartBtn").addEventListener("click", restartGame);

// Setup Game
createScene();
setupMobileControls();
spawnEnemies();

// Game Loop
engine.runRenderLoop(() => {
    if (!gameOver) {
        updateCamera();
        updateEnemies();
        
        // Regenerate health slowly
        if (player.health < player.maxHealth) {
            player.health += 0.01;
        }
    }
    
    updateUI();
    scene.render();
});

// Resize
window.addEventListener("resize", () => {
    engine.resize();
});
