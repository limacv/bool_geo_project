import { utils } from "./utils.js"
////////////////////
// CLASSES
////////////////////
export function TextAnimation_5(textGeometry) {
    var bufferGeometry = new THREE.BAS.ModelBufferGeometry(textGeometry);
    var aAnimation = bufferGeometry.createAttribute('aAnimation', 2);
    var aEndPosition = bufferGeometry.createAttribute('aEndPosition', 3);
    var aAxisAngle = bufferGeometry.createAttribute('aAxisAngle', 4);
    var faceCount = bufferGeometry.faceCount;
    var i, i2, i3, i4, v;

    var maxDelay = 0.0;
    var minDuration = 1.0;
    var maxDuration = 1.0;
    var stretch = 0.05;
    var lengthFactor = 0.01;
    var maxLength = textGeometry.boundingBox.max.length();

    this.animationDuration = maxDuration + maxDelay + stretch + lengthFactor * maxLength;
    this._animationProgress = 0;

    var axis = new THREE.Vector3();
    var angle;

    for (i = 0, i2 = 0, i3 = 0, i4 = 0; i < faceCount; i++ , i2 += 6, i3 += 9, i4 += 12) {
        var face = textGeometry.faces[i];
        var centroid = THREE.BAS.Utils.computeCentroid(textGeometry, face);
        var centroidN = new THREE.Vector3().copy(centroid).normalize();

        // animation
        var delay = (maxLength - centroid.length()) * lengthFactor;
        var duration = THREE.Math.randFloat(minDuration, maxDuration);

        for (v = 0; v < 6; v += 2) {
            aAnimation.array[i2 + v] = delay + stretch * Math.random();
            aAnimation.array[i2 + v + 1] = duration;
        }

        // end position
        var point = utils.fibSpherePoint(i, faceCount, 200);

        for (v = 0; v < 9; v += 3) {
            aEndPosition.array[i3 + v] = point.x;
            aEndPosition.array[i3 + v + 1] = point.y;
            aEndPosition.array[i3 + v + 2] = point.z;
        }

        // axis angle
        axis.x = centroidN.x;
        axis.y = -centroidN.y;
        axis.z = -centroidN.z;

        axis.normalize();

        angle = Math.PI * THREE.Math.randFloat(0.5, 2.0);

        for (v = 0; v < 12; v += 4) {
            aAxisAngle.array[i4 + v] = axis.x;
            aAxisAngle.array[i4 + v + 1] = axis.y;
            aAxisAngle.array[i4 + v + 2] = axis.z;
            aAxisAngle.array[i4 + v + 3] = angle;
        }
    }
    var material = new THREE.BAS.PhongAnimationMaterial({
        shading: THREE.FlatShading,
        side: THREE.DoubleSide,
        transparent: true,
        uniforms: {
            uTime: { type: 'f', value: 0 }
        },
        shaderFunctions: [
            THREE.BAS.ShaderChunk['cubic_bezier'],
            THREE.BAS.ShaderChunk['ease_out_cubic'],
            THREE.BAS.ShaderChunk['quaternion_rotation']
        ],
        shaderParameters: [
            'uniform float uTime;',
            'uniform vec3 uAxis;',
            'uniform float uAngle;',
            'attribute vec2 aAnimation;',
            'attribute vec3 aEndPosition;',
            'attribute vec4 aAxisAngle;'
        ],
        shaderVertexInit: [
            'float tDelay = aAnimation.x;',
            'float tDuration = aAnimation.y;',
            'float tTime = clamp(uTime - tDelay, 0.0, tDuration);',
            'float tProgress = ease(tTime, 0.0, 1.0, tDuration);'
            // 'float tProgress = tTime / tDuration;'
        ],
        shaderTransformPosition: [
            'transformed = mix(transformed, aEndPosition, tProgress);',

            'float angle = aAxisAngle.w * tProgress;',
            'vec4 tQuat = quatFromAxisAngle(aAxisAngle.xyz, angle);',
            'transformed = rotateVector(tQuat, transformed);',
        ]
    },
        {
            // diffuse: 0x444444,
            specular: new THREE.Color(0xcccccc),
            shininess: 4
            //emissive:0xffffff
        }
    );

    THREE.Mesh.call(this, bufferGeometry, material);

    this.frustumCulled = false;
}
TextAnimation_5.prototype = Object.create(THREE.Mesh.prototype);
TextAnimation_5.prototype.constructor = TextAnimation_5;

Object.defineProperty(TextAnimation_5.prototype, 'animationProgress', {
    get: function () {
        return this._animationProgress;
    },
    set: function (v) {
        this._animationProgress = v;
        this.material.uniforms['uTime'].value = this.animationDuration * v;
    }
});