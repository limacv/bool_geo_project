#include <packing>

varying vec2 vUv;
uniform sampler2D tDepth;

void main() {
    //float depth = readDepth( tDepth, vUv );
    float depth = texture2D( tDepth, vUv ).x;
    gl_FragColor.rgb = vec3( depth );
    gl_FragColor.a = 1.0;
}