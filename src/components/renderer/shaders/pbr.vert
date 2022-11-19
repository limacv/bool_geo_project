uniform mat4 shacamWorldMat;
uniform mat4 shacamProjMat;        

varying vec3 vWorldPos; // view space
varying vec2 vUv;
varying vec3 vNormal; // view space'
varying vec4 vShadowSpacePos;

void main()	{
    vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
    vUv = uv;
    vNormal = mat3(modelMatrix) * normal;
    vShadowSpacePos = (shacamProjMat * shacamWorldMat * vec4(vWorldPos, 1.));
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}