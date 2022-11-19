import { shaders } from "./shaders/shaders.js";
import { generateUV, exportAndDownload, loadFont, hsv2pos, createTweenScrubber } from "./mylib/myfunc.js";
import { TextAnimation_5 } from "./textAnimation/textAnimation_5.js"
import { TextAnimation_3 } from "./textAnimation/textAnimation_3.js"

export default class Renderer {
    constructor(opts = {}) {
        this.params = opts
        this.options = opts;
        this.width = window.innerWidth;
        this.height = window.innerHeight;

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setClearColor(0x000000)
        this.renderer.setSize(this.width, this.height);
        document.body.appendChild(this.renderer.domElement);

        // ----------scene---------------
        this.scene = new THREE.Scene();
        this.backgroundscene = new THREE.Scene();
        // this.camPersp = new THREE.PerspectiveCamera(45, this.width / this.height, 0.01, 200);
        this.camPersp = new THREE.PerspectiveCamera(60, this.width / this.height, 0.01, 100000);
        this.camPersp.position.set(-1, 0, 20);
        this.camOrtho = new THREE.OrthographicCamera(this.width / -100, this.width / 100, this.height / 100, this.height / -100, 0.01, 200);
        this.camOrtho.position.set(-1, 0, 20);

        // --------control block------------
        this.ctrlcamOrtho = new THREE.OrbitControls(this.camOrtho, this.renderer.domElement);
        this.ctrlcamOrtho.screenSpacePanning = true;
        this.ctrlcamOrtho.enableDamping = true;
        this.ctrlcamOrtho.autoRotate = this.params.camAutoRotate;
        this.ctrlcamOrtho.autoRotateSpeed = -5.0;
        this.ctrlcamPersp = new THREE.OrbitControls(this.camPersp, this.renderer.domElement);
        this.ctrlcamPersp.screenSpacePanning = true;
        this.ctrlcamPersp.enableDamping = true;
        this.ctrlcamPersp.autoRotate = this.params.camAutoRotate;
        this.ctrlcamPersp.autoRotateSpeed = -5.0;
        this.switchCamera();

        // -----used for generate shadow effect--------
        this.rendertarget = new THREE.WebGLRenderTarget(1024, 1024);
        this.rendertarget.texture.generateMipmaps = true;
        this.rendertarget.stencilBuffer = false;
        this.rendertarget.depthTexture = new THREE.DepthTexture();

        this.shadowCamera = new THREE.OrthographicCamera(-15, 15, 15, -15, 10, 90);
        this.material = new THREE.ShaderMaterial();
        this.depthmaterial = new THREE.MeshBasicMaterial({ color: 'blue' });

        // -------used for boolean geometry-----------
        this.boolGeos = [];
        this.viewIdxlast = 0;
        this.viewIdx = 0;
        this.geoNeedUpdate = false;
        this.cameraNeedChangeViewpoint = false;
        this.init();
        this.animate();
    }

    switchCamera() {
        if (this.params.camType === "Orthographic") {
            this.camera = this.camOrtho;
        }
        else if (this.params.camType === "Perspective") {
            this.camera = this.camPersp;
        }
    }
    loadCubeMap(text) {
        var envPath = "envmaps/" + text + "/";
        var urls = [
            envPath + 'posx.jpg',
            envPath + 'negx.jpg',
            envPath + 'posy.jpg',
            envPath + 'negy.jpg',
            envPath + 'posz.jpg',
            envPath + 'negz.jpg'
        ];
        var cube = new THREE.CubeTextureLoader().load(urls);
        cube.format = THREE.RGBFormat;
        return cube;
    }
    initialPBRMaterial(text) {
        this.material.extensions.derivatives = true;
        this.material.setValues({
            uniforms: THREE.UniformsUtils.merge([ // three.js is modified
                {
                    albedoMap: {}, normalMap: {}, metallicMap: {}, roughMap: {}, displaceMap: {}, aoMap: {},
                    envMap: { value: this.reflectionCube },
                    displaceScale: { value: this.params.displaceScale },
                    transparency: { value: this.params.transparency },
                    delta: { value: 0.8 },
                    shadowMap: { value: this.rendertarget.depthTexture },
                    shacamWorldMat: { value: this.shadowCamera.matrixWorldInverse },
                    shacamProjMat: { value: this.shadowCamera.projectionMatrix }
                },
                THREE.UniformsLib['lights']
            ]),
            lights: true,
            vertexShader: shaders.pbr.vert,
            fragmentShader: shaders.pbr.frag,
            wireframe: false
        });
        this.updatePBRMaterial(text);
    }
    updatePBRMaterial(text) {
        function wrap(texture) {
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        }
        function anisotropy(texture) {
            texture.anisotropy = 4;
        }
        var pathhalf = "models/" + text + "/" + text;
        var path = {
            color: pathhalf + "_col.jpg",
            normal: pathhalf + "_nrm.jpg",
            rough: pathhalf + "_rgh.jpg",
            metal: pathhalf + "_met.jpg",
            displace: pathhalf + "_disp.jpg",
            ao: pathhalf + "_AO.jpg",
        }
        var textureLoader = new THREE.TextureLoader();
        var map = textureLoader.load(path.color),
            normalMap = textureLoader.load(path.normal),
            roughnessMap = textureLoader.load(path.rough),
            metalnessMap = textureLoader.load(path.metal),
            displacementMap = textureLoader.load(path.displace),
            aoMap = textureLoader.load(path.ao);
        wrap(map); wrap(normalMap); wrap(roughnessMap); wrap(metalnessMap); wrap(displacementMap); wrap(aoMap);
        anisotropy(map);//anisotropy(displacementMap);
        this.material.uniforms.albedoMap.value = map;
        this.material.uniforms.normalMap = { value: normalMap };
        this.material.uniforms.metallicMap = { value: metalnessMap };
        this.material.uniforms.roughMap = { value: roughnessMap };
        this.material.uniforms.displaceMap = { value: displacementMap };
        this.material.uniforms.aoMap = { value: aoMap };
    }
    _generateGeo(geoOpt) {
        var geo = new THREE.TextGeometry(geoOpt.text, {
            font: this.font, size: geoOpt.size, height: geoOpt.height, weight: 'bold', style: 'normal', curveSegments: 8,
            bevelEnabled: geoOpt.bevelEnabled, bevelThickness: geoOpt.bevelThickness,
            bevelSize: geoOpt.bevelSize, bevelSegments: 3,
        });
        geo.translate(-geoOpt.text.length * 0.764 * geoOpt.size / 2, 0., -geoOpt.height / 2);
        generateUV(geo, geoOpt.textureScale);
        geo.computeVertexNormals();
        var buffergeo = new THREE.BufferGeometry();
        return buffergeo.fromGeometry(geo);
    }

    updateTextGeo() {
        if (this.geoNeedUpdate) {
            this.scene.getObjectByName("1").geometry.dispose();
            this.scene.remove(this.scene.getObjectByName("2"));
            if (this.params.mode === "Simple Text") {
                if (this.cameraNeedChangeViewpoint) {
                    this.camPersp.position.set(-1, 0, 20);
                    this.cameraNeedChangeViewpoint = false;
                }
                this.scene.getObjectByName("1").visible = true;
                if (this.params.textparams.text == 'box')
                    this.scene.getObjectByName("1").geometry = new THREE.BoxGeometry(10, 10, 10);
                else
                    this.scene.getObjectByName("1").geometry = this._generateGeo(this.params.textparams);
            }
            else if (this.params.mode === "Bool Text") {
                if (this.cameraNeedChangeViewpoint) {
                    this.camPersp.position.set(-1, 0, 20);
                    this.cameraNeedChangeViewpoint = false;
                }
                this.scene.getObjectByName("1").visible = true;
                this.scene.getObjectByName("1").geometry = this.boolGeos[this.viewIdx];
            }
            this.geoNeedUpdate = false;
        }
    }
    buildBoolGeo(opt) {
        function genTexGeo(idx, angle) {
            var geo = new THREE.TextGeometry(texts[idx], {
                font: this.font, size: opt.size, height: maxHeight, curveSegments: 2,
                bevelEnabled: false
            });
            geo.translate(-textHeights[idx] / 2, 0., -maxHeight / 2);
            geo.rotateY(angle);
            return new ThreeBSP(geo);
        }
        const fontx = 0.764, fonty = 0.886;
        var texts = [opt.text1, opt.text2, opt.text3, opt.text4];
        var textHeights = Array.from([0, 1, 2, 3], x => texts[x].length * fontx * opt.size);
        var maxHeight = Math.max.apply(null, textHeights);
        var geos = Array.from([0, 1, 2, 3], x => (genTexGeo.bind(this))(x, x * Math.PI / 2));
        this.boolGeos = Array.from([0, 1, 2, 3], x => geos[x].intersect(geos[(x + 1) % 4]).toGeometry());
    }
    _changeViewidx() {
        var x = this.camera.position.x, z = this.camera.position.z;
        if (z < 0) {
            if (x >= 0) { this.viewIdx = 1; }
            else { this.viewIdx = 2; }
        }
        else {
            if (x < 0) { this.viewIdx = 3; }
            else { this.viewIdx = 0; }
        }
        if (this.viewIdx != this.viewIdxlast) {
            this.geoNeedUpdate = true;
            this.viewIdxlast = this.viewIdx;
        }
    }

    init() { // scene initialize
        // object initialization
        // -----------------------------------
        var camHelper = new THREE.CameraHelper(this.shadowCamera);
        camHelper.name = "camHelper";
        camHelper.visible = this.params.cameraVisible;
        var axisHelper = new THREE.AxesHelper(10);
        axisHelper.name = "axisHelper"
        axisHelper.visible = this.params.axisVisible;
        this.scene.add(camHelper);
        this.scene.add(axisHelper);

        var ambient = new THREE.AmbientLight(0x080808);
        this.scene.add(ambient);

        var litpos = hsv2pos(this.params.shadowDir);
        var light = new THREE.DirectionalLight(0xffffff);
        light.position.set(litpos.x, litpos.z, litpos.y);
        light.lookAt(0., 0., 0.);
        light.name = "shadowLight";
        this.scene.add(light);

        this.shadowCamera.position.set(litpos.x, litpos.z, litpos.y);
        this.shadowCamera.lookAt(0., 0., 0.);

        var lightGeo = new THREE.PlaneGeometry(15, 15);
        var lightMaterial = new THREE.MeshBasicMaterial(0xffffff);
        lightMaterial.transparent = true;
        lightMaterial.opacity = 0.8;
        lightMaterial.side = THREE.DoubleSide;
        var lightMesh = new THREE.Mesh(lightGeo, lightMaterial);
        lightMesh.position.set(litpos.x, litpos.z, litpos.y);
        lightMesh.lookAt(0., 0., 0.);
        lightMesh.name = "lightMesh";
        this.scene.add(lightMesh);

        this.reflectionCube = this.loadCubeMap(this.params.envmap);
        // This line displays the reflectionCube as the scene's background.
        this.backgroundscene.background = this.reflectionCube;
        // loadFont("font/Consolas_Regular.json").then(font => {
        var font;
        jQuery.ajax({
            url: "font/Consolas_Regular.json",
            async: false,
            success: function (result) {
                font = new THREE.FontLoader().parse(result);
            }
        });
        this.font = font;
        this.initialPBRMaterial(this.params.material);
        var mainMeshGeo = this._generateGeo(this.params.textparams);
        var mainMesh = new THREE.Mesh(mainMeshGeo, this.material);
        mainMesh.name = "1";
        this.scene.add(mainMesh);
    }

    animate = function () {
        requestAnimationFrame(this.animate.bind(this));
        if (this.params.mode === "Bool Text") {
            this._changeViewidx();
        }
        this.updateTextGeo();
        var mesh = this.scene.getObjectByName("1");
        if (mesh) {
            // if (mesh) {
            this.renderer.setRenderTarget(this.rendertarget);
            mesh.material = this.depthmaterial;
            // mesh.material.side = THREE.BackSide;
            this.renderer.render(this.scene, this.shadowCamera);
            mesh.material = this.material;

            this.renderer.setRenderTarget(null);
            // render background first
            this.renderer.autoClear = false;
            this.renderer.render(this.backgroundscene, this.camPersp);
            // mesh.material.side = THREE.FrontSide;

            this.renderer.render(this.scene, this.camera);
            this.renderer.autoClear = true;
        }

        this.ctrlcamPersp.update();
        this.ctrlcamOrtho.update();
    }

}

