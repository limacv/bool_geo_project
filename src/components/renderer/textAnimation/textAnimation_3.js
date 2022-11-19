export function TextAnimation_3(textGeometry) {
    var bufferGeometry = new THREE.BAS.ModelBufferGeometry(textGeometry);

    var aAnimation = bufferGeometry.createAttribute('aAnimation', 2);
    var aCentroid = bufferGeometry.createAttribute('aCentroid', 3);
    var aControl0 = bufferGeometry.createAttribute('aControl0', 3);
    var aControl1 = bufferGeometry.createAttribute('aControl1', 3);
    var aEndPosition = bufferGeometry.createAttribute('aEndPosition', 3);
    var aAxisAngle = bufferGeometry.createAttribute('aAxisAngle', 4);

    var faceCount = bufferGeometry.faceCount;
    var i, i2, i3, i4, v;
    var keys = ['a', 'b', 'c'];
    var vDelay = new THREE.Vector3();

    var maxDelay = 0.0;
    var minDuration = 1.0;
    var maxDuration = 1.0;
    var stretch = 0.0125;
    var lengthFactor = 0.01;
    var maxLength = textGeometry.boundingBox.max.length();

    this.animationDuration = maxDuration + maxDelay + stretch + lengthFactor * maxLength;
    this._animationProgress = 0;

    var distanceZ = -400;

    var axis = new THREE.Vector3();
    var angle;

    for (i = 0, i2 = 0, i3 = 0, i4 = 0; i < faceCount; i++ , i2 += 6, i3 += 9, i4 += 12) {
        var face = textGeometry.faces[i];
        var centroid = THREE.BAS.Utils.computeCentroid(textGeometry, face);

        // animation
        var delay = centroid.length() * lengthFactor + Math.random() * maxDelay;
        var duration = THREE.Math.randFloat(minDuration, maxDuration);

        for (v = 0; v < 6; v += 2) {
            var vertex = textGeometry.vertices[face[keys[v * 0.5]]];
            var vertexDelay = vDelay.subVectors(centroid, vertex).length() * 0.0001;

            aAnimation.array[i2 + v] = delay + vertexDelay + stretch * Math.random();
            aAnimation.array[i2 + v + 1] = duration;
        }

        // centroid
        for (v = 0; v < 9; v += 3) {
            aCentroid.array[i3 + v] = centroid.x;
            aCentroid.array[i3 + v + 1] = centroid.y;
            aCentroid.array[i3 + v + 2] = centroid.z;
        }

        // ctrl
        var c0x = centroid.x * THREE.Math.randFloat(0.75, 1.0);
        var c0y = centroid.y * THREE.Math.randFloat(0.75, 1.0);
        var c0z = distanceZ * THREE.Math.randFloat(0.5, 0.75);

        var c1x = centroid.x * THREE.Math.randFloat(0.25, 0.5);
        var c1y = centroid.y * THREE.Math.randFloat(0.25, 0.5);
        var c1z = distanceZ * THREE.Math.randFloat(0.75, 1.0);

        for (v = 0; v < 9; v += 3) {
            aControl0.array[i3 + v] = c0x;
            aControl0.array[i3 + v + 1] = c0y;
            aControl0.array[i3 + v + 2] = c0z;

            aControl1.array[i3 + v] = c1x;
            aControl1.array[i3 + v + 1] = c1y;
            aControl1.array[i3 + v + 2] = c1z;
        }

        // end position
        var x, y, z;

        x = 0;
        y = 0;
        z = distanceZ;

        for (v = 0; v < 9; v += 3) {
            aEndPosition.array[i3 + v] = x;
            aEndPosition.array[i3 + v + 1] = y;
            aEndPosition.array[i3 + v + 2] = z;
        }

        // axis angle
        // axis.x = THREE.Math.randFloatSpread(0.25);
        // axis.y = THREE.Math.randFloatSpread(0.25);
        // axis.z = 1.0;
        // axis.x = -centroid.x * 0.0001;
        // axis.y = centroid.y * 0.0005;
        axis.x = 0;
        axis.y = 0;
        axis.z = 1;

        axis.normalize();

        angle = Math.PI * THREE.Math.randFloat(4, 6);
        // angle = Math.PI * 4;

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
            'attribute vec3 aCentroid;',
            'attribute vec3 aControl0;',
            'attribute vec3 aControl1;',
            'attribute vec3 aEndPosition;',
            'attribute vec4 aAxisAngle;'
        ],
        shaderVertexInit: [
            'float tDelay = aAnimation.x;',
            'float tDuration = aAnimation.y;',
            'float tTime = clamp(uTime - tDelay, 0.0, tDuration);',
            'float tProgress =  ease(tTime, 0.0, 1.0, tDuration);'
            //'float tProgress = tTime / tDuration;'
        ],
        shaderTransformPosition: [
            // 'transformed -= aCentroid;',
            'transformed *= 1.0 - tProgress;',
            // 'transformed += aCentroid;',

            'transformed += cubicBezier(transformed, aControl0, aControl1, aEndPosition, tProgress);',
            // 'transformed += aEndPosition * tProgress;'

            'float angle = aAxisAngle.w * tProgress;',
            'vec4 tQuat = quatFromAxisAngle(aAxisAngle.xyz, angle);',
            'transformed = rotateVector(tQuat, transformed);'
        ]
    },
        {
            // diffuse: 0xffffff
        }
    );

    THREE.Mesh.call(this, bufferGeometry, material);

    this.frustumCulled = false;
}
TextAnimation_3.prototype = Object.create(THREE.Mesh.prototype);
TextAnimation_3.prototype.constructor = TextAnimation_3;

Object.defineProperty(TextAnimation_3.prototype, 'animationProgress', {
    get: function () {
        return this._animationProgress;
    },
    set: function (v) {
        this._animationProgress = v;
        this.material.uniforms['uTime'].value = this.animationDuration * v;
    }
});
