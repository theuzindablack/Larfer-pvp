// --- 1. CONFIGURAÇÃO DA CENA ---
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x76B6FF);

        const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(renderer.domElement);

        const light = new THREE.DirectionalLight(0xffffff, 1.3);
        light.position.set(10, 40, 15);
        scene.add(light);
        scene.add(new THREE.AmbientLight(0x777777));

        // Chão verde
        const floorGeo = new THREE.BoxGeometry(100, 1, 100);
        const floorMat = new THREE.MeshLambertMaterial({ color: 0x3A9E3A });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.position.y = -0.5;
        scene.add(floor);

        const alvosveis = [];
        const partesFisicasBot = [];

        // --- 2. CRIAR MODELO R6 ---
        function criarBonecoR6(corTorso, corPernas, corPele) {
            const boneco = new THREE.Group();
            const listaPartes = [];

            const torsoGeo = new THREE.BoxGeometry(2, 2, 1);
            const torsoMat = new THREE.MeshLambertMaterial({ color: corTorso });
            const torso = new THREE.Mesh(torsoGeo, torsoMat);
            torso.position.y = 2;
            boneco.add(torso);
            listaPartes.push({ mesh: torso, posPadrao: new THREE.Vector3(0, 2, 0), rotPadrao: new THREE.Vector3(0,0,0) });

            const cabecaGeo = new THREE.BoxGeometry(1.2, 1.2, 1.2);
            const cabecaMat = new THREE.MeshLambertMaterial({ color: corPele });
            const cabeca = new THREE.Mesh(cabecaGeo, cabecaMat);
            cabeca.position.y = 3.6;
            boneco.add(cabeca);
            listaPartes.push({ mesh: cabeca, posPadrao: new THREE.Vector3(0, 3.6, 0), rotPadrao: new THREE.Vector3(0,0,0) });

            const membroGeo = new THREE.BoxGeometry(0.9, 2, 1);
            const braçoMat = new THREE.MeshLambertMaterial({ color: corPele });
            const pernaMat = new THREE.MeshLambertMaterial({ color: corPernas });

            const pivoBE = new THREE.Group(); pivoBE.position.set(-1.5, 2.8, 0);
            const bEsq = new THREE.Mesh(membroGeo, braçoMat); bEsq.position.y = -0.9;
            pivoBE.add(bEsq); boneco.add(pivoBE);
            listaPartes.push({ mesh: pivoBE, posPadrao: new THREE.Vector3(-1.5, 2.8, 0), rotPadrao: new THREE.Vector3(0,0,0) });

            const pivoBD = new THREE.Group(); pivoBD.position.set(1.5, 2.8, 0);
            const bDir = new THREE.Mesh(membroGeo, braçoMat); bDir.position.y = -0.9;
            pivoBD.add(bDir); boneco.add(pivoBD);
            listaPartes.push({ mesh: pivoBD, posPadrao: new THREE.Vector3(1.5, 2.8, 0), rotPadrao: new THREE.Vector3(0,0,0) });

            const pivoPE = new THREE.Group(); pivoPE.position.set(-0.55, 1.1, 0);
            const pEsq = new THREE.Mesh(membroGeo, pernaMat); pEsq.position.y = -0.9;
            pivoPE.add(pEsq); boneco.add(pivoPE);
            listaPartes.push({ mesh: pivoPE, posPadrao: new THREE.Vector3(-0.55, 1.1, 0), rotPadrao: new THREE.Vector3(0,0,0) });

            const pivoPD = new THREE.Group(); pivoPD.position.set(0.55, 1.1, 0);
            const pDir = new THREE.Mesh(membroGeo, pernaMat); pDir.position.y = -0.9;
            pivoPD.add(pDir); boneco.add(pivoPD);
            listaPartes.push({ mesh: pivoPD, posPadrao: new THREE.Vector3(0.55, 1.1, 0), rotPadrao: new THREE.Vector3(0,0,0) });

            return { mesh: boneco, pivoBD: pivoBD, pivoBE: pivoBE, pivoPD: pivoPD, pivoPE: pivoPE, torso: torso, cabeca: cabeca, partes: listaPartes };
        }

        const jogador = criarBonecoR6(0x0055FF, 0x00AA00, 0xFFD700);
        const noob = jogador.mesh;
        scene.add(noob);

        const botObj = criarBonecoR6(0x777777, 0x555555, 0xCCCCCC);
        const bot = botObj.mesh;
        bot.position.set(0, 0, -15);
        scene.add(bot);

        bot.traverse((child) => { if (child.isMesh) alvosveis.push(child); });

        // SISTEMA DE VIDA E CONTROLE DE VISIBILIDADE
        let vidaBot = 100;
        const maxVidaBot = 100;
        let botVivo = true;
        let barraRevelada = false; // Controla se o bot já foi atingido alguma vez
        const uiVidaFill = document.getElementById('health-bar-fill');
        const uiVidaContainer = document.getElementById('health-bar-container');

        // Arma do jogador
        const armaGroup = new THREE.Group();
        const canoGeo = new THREE.CylinderGeometry(0.15, 0.15, 1.5);
        canoGeo.rotateX(Math.PI / 2);
        const cano = new THREE.Mesh(canoGeo, new THREE.MeshLambertMaterial({ color: 0x222222 }));
        cano.position.set(0, -0.8, 0.6); 
        armaGroup.add(cano);
        jogador.pivoBD.add(armaGroup);
        armaGroup.visible = false;

        // INVENTÁRIO TOQUES
        let slotAtivo = null;
        const dadosArmas = {
            1: { nome: "M4A1", corTiro: 0xFFFF00, dano: 20 },
            2: { nome: "Remington", corTiro: 0xFF4500, dano: 40 }
        };

        function selecionarSlot(numero) {
            if (slotAtivo === numero) { desequiparArma(); return; }
            desequiparArma();
            slotAtivo = numero;
            document.getElementById(`slot-${numero}`).classList.add('active');
            armaGroup.visible = true;
        }

        function desequiparArma() {
            if (slotAtivo) document.getElementById(`slot-${slotAtivo}`).classList.remove('active');
            slotAtivo = null;
            armaGroup.visible = false;
        }

        document.getElementById('slot-1').addEventListener('touchstart', (e) => { e.stopPropagation(); selecionarSlot(1); });
        document.getElementById('slot-2').addEventListener('touchstart', (e) => { e.stopPropagation(); selecionarSlot(2); });

        // DESPEDAÇAR AO MORRER
        function despedacarBot() {
            botVivo = false;
            barraRevelada = false; // Esconde a barra enquanto ele estiver morto
            partesFisicasBot.length = 0;

            botObj.partes.forEach(p => {
                const posicaoMundial = new THREE.Vector3();
                p.mesh.getWorldPosition(posicaoMundial);
                const rotationMundial = new THREE.Quaternion();
                p.mesh.getWorldQuaternion(rotationMundial);

                scene.add(p.mesh);
                p.mesh.position.copy(posicaoMundial);
                p.mesh.quaternion.copy(rotationMundial);

                partesFisicasBot.push({
                    mesh: p.mesh,
                    velX: (Math.random() - 0.5) * 0.25,
                    velY: Math.random() * 0.25 + 0.15,
                    velZ: (Math.random() - 0.5) * 0.25,
                    rotX: (Math.random() - 0.5) * 0.1,
                    rotY: (Math.random() - 0.5) * 0.1,
                    rotZ: (Math.random() - 0.5) * 0.1
                });
            });

            setTimeout(() => { respawnBot(); }, 2000);
        }

        function respawnBot() {
            partesFisicasBot.length = 0;
            botObj.partes.forEach(p => {
                bot.add(p.mesh);
                p.mesh.position.copy(p.posPadrao);
                p.mesh.rotation.set(p.rotPadrao.x, p.rotPadrao.y, p.rotPadrao.z);
            });

            bot.position.set(0, 0, -15);
            vidaBot = maxVidaBot;
            uiVidaFill.style.width = "100%";
            botVivo = true;
            // Note que 'barraRevelada' continua false! Ela só vai reaparecer no próximo tiro do novo respawn.
        }

        // MECÂNICA DE TIRO
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();

        function processarTiroFisico(clientX, clientY) {
            if (!slotAtivo || !botVivo) return;

            mouse.x = (clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(clientY / window.innerHeight) * 2 + 1;

            raycaster.setFromCamera(mouse, camera);
            const interseccoes = raycaster.intersectObjects(alvosveis);
            let pontoFinal = new THREE.Vector3();

            if (interseccoes.length > 0) {
                const acerto = interseccoes[0];
                pontoFinal.copy(acerto.point);

                let meshAtingida = acerto.object;
                const corOriginal = meshAtingida.material.color.getHex();
                meshAtingida.material.color.setHex(0xFF0000); 
                setTimeout(() => meshAtingida.material.color.setHex(corOriginal), 120);

                if(vidaBot > 0) {
                    // MUDANÇA: No primeiríssimo tiro, revela a barra de vida permanentemente até morrer
                    if (!barraRevelada) {
                        barraRevelada = true;
                    }

                    vidaBot -= dadosArmas[slotAtivo].dano;
                    if(vidaBot < 0) vidaBot = 0;
                    uiVidaFill.style.width = (vidaBot / maxVidaBot) * 100 + "%";
                    
                    if(vidaBot <= 0) {
                        despedacarBot();
                    }
                }
            } else {
                raycaster.ray.at(60, pontoFinal);
            }

            const posicaoArma = new THREE.Vector3();
            cano.getWorldPosition(posicaoArma);
            const laserGeo = new THREE.BufferGeometry().setFromPoints([posicaoArma, pontoFinal]);
            const laser = new THREE.Line(laserGeo, new THREE.LineBasicMaterial({ color: dadosArmas[slotAtivo].corTiro, linewidth: 3 }));
            scene.add(laser);
            setTimeout(() => { scene.remove(laser); }, 40);
        }

        // GERENCIADOR MULTI-TOUCH
        let cameraRaio = 22, cameraTheta = 0, cameraPhi = Math.PI / 5;
        let velY = 0, estaNoChao = true;
        const gravidade = 0.015, forçaPulo = 0.35;

        let idToqueJoystick = null, idToqueCamera = null;
        let cameraUltimoX = 0, cameraUltimoY = 0;
        let estaMovendoMobile = false, forçaJoystick = 0, inputX = 0, inputZ = 0;

        const cameraZone = document.getElementById('camera-touch-zone');
        const joystickZone = document.getElementById('joystick-zone');
        const joystickStick = document.getElementById('joystick-stick');
        const jumpButton = document.getElementById('jump-button');

        jumpButton.addEventListener('touchstart', (e) => {
            e.preventDefault(); e.stopPropagation();
            if (estaNoChao) { velY = forçaPulo; estaNoChao = false; }
        });

        joystickZone.addEventListener('touchstart', (e) => {
            e.preventDefault(); e.stopPropagation();
            const toque = e.changedTouches[0];
            idToqueJoystick = toque.identifier;
            atualizarJoystick(toque);
        });

        cameraZone.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const toque = e.changedTouches[0];

            if (slotAtivo) { processarTiroFisico(toque.clientX, toque.clientY); }

            if (idToqueCamera === null) {
                idToqueCamera = toque.identifier;
                cameraUltimoX = toque.clientX; cameraUltimoY = toque.clientY;
            }
        });

        window.addEventListener('touchmove', (e) => {
            for (let toque of e.touches) {
                if (toque.identifier === idToqueJoystick) atualizarJoystick(toque);
                if (toque.identifier === idToqueCamera) {
                    let deltaX = toque.clientX - cameraUltimoX;
                    let deltaY = toque.clientY - cameraUltimoY;
                    cameraTheta -= deltaX * 0.007; cameraPhi += deltaY * 0.007;
                    cameraPhi = Math.max(0.05, Math.min(Math.PI / 2 - 0.05, cameraPhi));
                    cameraUltimoX = toque.clientX; cameraUltimoY = toque.clientY;
                }
            }
        }, { passive: false });

        window.addEventListener('touchend', (e) => {
            for (let toque of e.changedTouches) {
                if (toque.identifier === idToqueJoystick) {
                    joystickStick.style.transform = `translate(0px, 0px)`;
                    estaMovendoMobile = false; inputX = 0; inputZ = 0; forçaJoystick = 0; idToqueJoystick = null;
                }
                if (toque.identifier === idToqueCamera) idToqueCamera = null;
            }
        });

        function atualizarJoystick(t) {
            const bounds = joystickZone.getBoundingClientRect();
            const centroX = bounds.left + bounds.width / 2;
            const centroY = bounds.top + bounds.height / 2;
            let difX = t.clientX - centroX, difY = t.clientY - centroY;
            let distancia = Math.sqrt(difX * difX + difY * difY);
            const raioMax = 45;

            if (distancia > raioMax) {
                difX = (difX / distancia) * raioMax; difY = (difY / distancia) * raioMax; distancia = raioMax;
            }

            joystickStick.style.transform = `translate(${difX}px, ${difY}px)`;
            estaMovendoMobile = true; forçaJoystick = distancia / raioMax; inputX = difX / raioMax; inputZ = difY / raioMax;
        }

        window.addEventListener('mousedown', (e) => {
            if (e.clientY > window.innerHeight - 90 && e.clientX > window.innerWidth/2 - 70 && e.clientX < window.innerWidth/2 + 70) return;
            if (e.clientX < 180 && e.clientY > window.innerHeight - 180) return;
            if (e.clientX > window.innerWidth - 130 && e.clientY > window.innerHeight - 130) return;
            processarTiroFisico(e.clientX, e.clientY);
        });

        const teclando = {};
        window.addEventListener('keydown', (e) => { teclando[e.key.toLowerCase()] = true; if(e.key === " ") { if(estaNoChao) { velY = forçaPulo; estaNoChao = false; } } });
        window.addEventListener('keyup', (e) => teclando[e.key.toLowerCase()] = false);

        // --- 7. LOOP PRINCIPAL ---
        let relogioAnimaçao = 0;

        function animar() {
            requestAnimationFrame(animar);

            // Física dos pedaços caídos
            partesFisicasBot.forEach(p => {
                p.mesh.position.x += p.velX; p.mesh.position.y += p.velY; p.mesh.position.z += p.velZ;
                p.mesh.rotation.x += p.rotX; p.mesh.rotation.y += p.rotY; p.mesh.rotation.z += p.rotZ;
                p.velY -= 0.01;

                if (p.mesh.position.y < 0.4) {
                    p.mesh.position.y = 0.4;
                    p.velX *= 0.6; p.velZ *= 0.6; p.velY = 0;
                    p.rotX *= 0.6; p.rotY *= 0.6; p.rotZ *= 0.6;
                }
            });

            // Movimento jogador
            let andando = false;
            let moveX = 0, moveZ = 0;
            const velBase = 0.18;

            if (teclando['w']) { moveZ = -1; andando = true; }
            if (teclando['s']) { moveZ = 1; andando = true; }
            if (teclando['a']) { moveX = -1; andando = true; }
            if (teclando['d']) { moveX = 1; andando = true; }
            if (estaMovendoMobile) { moveX = inputX; moveZ = inputZ; andando = true; }

            if (andando) {
                let direçaoFrente = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraTheta);
                let direçaoLado = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraTheta);
                let direçaoFinal = new THREE.Vector3().addScaledVector(direçaoLado, moveX).addScaledVector(direçaoFrente, -moveZ).normalize();
                noob.position.addScaledVector(direçaoFinal, velBase * (estaMovendoMobile ? forçaJoystick : 1));

                let anguloAlvo = Math.atan2(direçaoFinal.x, direçaoFinal.z);
                let diferencaAngulo = anguloAlvo - noob.rotation.y;
                diferencaAngulo = Math.atan2(Math.sin(diferencaAngulo), Math.cos(diferencaAngulo));
                noob.rotation.y += diferencaAngulo * 0.3;
            }

            if (slotAtivo) { jogador.pivoBD.rotation.x = -Math.PI / 2; jogador.pivoBD.rotation.z = 0; }

            noob.position.y += velY;
            if (!estaNoChao) {
                velY -= gravidade;
                if (noob.position.y <= 0) { noob.position.y = 0; velY = 0; estaNoChao = true; }
            }

            if (!estaNoChao) {
                jogador.pivoBE.rotation.x = -Math.PI * 0.2;
                if(!slotAtivo) jogador.pivoBD.rotation.x = -Math.PI * 0.2;
                jogador.pivoPE.rotation.x = 0.1; jogador.pivoPD.rotation.x = -0.1;
            } else if (andando) {
                relogioAnimaçao += 0.25 * (estaMovendoMobile ? forçaJoystick : 1);
                let balanço = Math.sin(relogioAnimaçao) * 0.75;
                jogador.pivoPE.rotation.x = balanço; jogador.pivoPD.rotation.x = -balanço;
                jogador.pivoBE.rotation.x = -balanço; if (!slotAtivo) jogador.pivoBD.rotation.x = balanço;
            } else {
                jogador.pivoBE.rotation.x = 0; if (!slotAtivo) jogador.pivoBD.rotation.x = 0;
                jogador.pivoPE.rotation.x = 0; jogador.pivoPD.rotation.x = 0;
            }

            camera.position.x = noob.position.x + cameraRaio * Math.sin(cameraTheta) * Math.cos(cameraPhi);
            camera.position.y = noob.position.y + cameraRaio * Math.sin(cameraPhi) + 1.5;
            camera.position.z = noob.position.z + cameraRaio * Math.cos(cameraTheta) * Math.cos(cameraPhi);
            camera.lookAt(noob.position.x, noob.position.y + 1.5, noob.position.z);

            // --- MUDANÇA: ATUALIZAR BARRA SÓ SE ELA ESTIVER REVELADA ---
            if (botVivo && barraRevelada) {
                const posicaoCabecaBot = new THREE.Vector3();
                botObj.cabeca.getWorldPosition(posicaoCabecaBot);
                posicaoCabecaBot.y += 1.2;
                posicaoCabecaBot.project(camera);

                if(posicaoCabecaBot.z <= 1) {
                    const x = (posicaoCabecaBot.x * .5 + .5) * window.innerWidth;
                    const y = (posicaoCabecaBot.y * -.5 + .5) * window.innerHeight;
                    uiVidaContainer.style.left = (x - 40) + 'px';
                    uiVidaContainer.style.top = y + 'px';
                    uiVidaContainer.style.display = 'block'; // Mostra na tela
                } else {
                    uiVidaContainer.style.display = 'none';
                }
            } else {
                uiVidaContainer.style.display = 'none'; // Fica invisível se não levou tiro ou se está morto
            }

            renderer.render(scene, camera);
        }

        animar();

        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });
