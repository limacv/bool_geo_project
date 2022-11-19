varying vec3 vWorldPos;
varying vec2 vUv;
varying vec3 vNormal;
varying vec4 vShadowSpacePos;

uniform sampler2D albedoMap;
uniform sampler2D normalMap;
uniform sampler2D metallicMap;
uniform sampler2D roughMap;
uniform sampler2D displaceMap;
uniform sampler2D aoMap;
uniform sampler2D shadowMap;
uniform float displaceScale;
uniform float transparency;
uniform float delta;
uniform samplerCube envMap;

struct DirLights{
    vec3 color;
    vec3 direction;
};

uniform DirLights directionalLights[ NUM_DIR_LIGHTS ]; 
uniform vec3 ambientLightColor;

const float PI = 3.1415926535;

mat3 transpose(mat3 M)
{
    return mat3(
        vec3(M[0].x, M[1].x, M[2].x), 
        vec3(M[0].y, M[1].y, M[2].y), 
        vec3(M[0].z, M[1].z, M[2].z));
}
// vNormal: normal of the fragment
mat3 NormalSpaceMat()
{
    vec3 Q1 = dFdx(vWorldPos);
    vec3 Q2 = dFdy(vWorldPos);
    float dv1 = dFdx(vUv.y);
    float dv2 = dFdy(vUv.y);

    vec3 N = normalize(vNormal);
    vec3 T = normalize(Q1*dv2 - Q2*dv1);
    vec3 B = normalize(cross(N, T));
    return mat3(T, B, N);
}
vec2 displaceUV(mat3 TBN, vec3 viewDir)
{
    vec3 V = normalize(transpose(TBN) * viewDir); // veiw vector in normal space
    // ------my own method----
    // float depth = displaceScale * (1. - texture2D(displaceMap, vUv).r);
    // for (int i = 0; i < 5; ++i) // iterate for 5 times
    // {
    //     V = V * depth / (V.z);
    //     depth = displaceScale * (1. - texture2D(displaceMap, vUv - V.xy).r) * 0.6 + depth * 0.4;
    // }
    // return vUv - V.xy;
    // ------parallax occlusion map-------
    // number of depth layers
    const float minLayers = 16.;
    const float maxLayers = 100.;
    float numLayers = mix(maxLayers, minLayers, abs(V.z));
    float layerDepth = 1.0 / numLayers;
    float currentLayerDepth = 0.0;
    vec2 deltaTexCoords = V.xy / V.z * displaceScale / numLayers;
  
    // get initial values
    vec2  currentTexCoords     = vUv;
    float currentDepthMapValue = (1. - texture2D(displaceMap, currentTexCoords).r);
    for (int i = 0; i <= int(maxLayers)+1; ++i)
    {
        if (currentLayerDepth > currentDepthMapValue) break;
        // shift texture coordinates along direction of P
        currentTexCoords -= deltaTexCoords;
        // get depthmap value at current texture coordinates
        currentDepthMapValue = (1. - texture2D(displaceMap, currentTexCoords).r);  
        // get depth of next layer
        currentLayerDepth += layerDepth;  
    }
    // get texture coordinates before collision (reverse operations)
    vec2 prevTexCoords = currentTexCoords + deltaTexCoords;

    // get depth after and before collision for linear interpolation
    float afterDepth  = currentDepthMapValue - currentLayerDepth;
    float beforeDepth = (1. - texture2D(displaceMap, prevTexCoords).r) - currentLayerDepth + layerDepth;
 
    // interpolation of texture coordinates
    float weight = afterDepth / (afterDepth - beforeDepth);
    vec2 finalTexCoords = prevTexCoords * weight + currentTexCoords * (1.0 - weight);
    
    return finalTexCoords;
}
vec3 getNormal(mat3 TBN, vec2 uv)
{
    vec3 tangentNormal = texture2D(normalMap, uv).xyz * 2. - 1.;
    float zScale = displaceScale / 0.085;
    // attention!: the normal map's nv coordinate is inverted
    return normalize(TBN * vec3(tangentNormal.x * zScale, -tangentNormal.y * zScale, tangentNormal.z));
}
// ----------
float DistributionGGX(vec3 N, vec3 H, float roughness)
{
    float a = roughness*roughness;
    float a2 = a*a;
    float NdotH = max(dot(N, H), 0.0);
    float NdotH2 = NdotH*NdotH;

    float nom   = a2;
    float denom = (NdotH2 * (a2 - 1.0) + 1.0);
    denom = PI * denom * denom;

    return nom / denom;
}
// ----------
float GeometrySchlickGGX(float NdotV, float roughness)
{
    float r = (roughness + 1.0);
    float k = (r*r) / 8.0;

    float nom   = NdotV;
    float denom = NdotV * (1.0 - k) + k;

    return nom / denom;
}
// --------
float GeometrySmith(vec3 N, vec3 V, vec3 L, float roughness)
{
    float NdotV = max(dot(N, V), 0.0);
    float NdotL = max(dot(N, L), 0.0);
    float ggx2 = GeometrySchlickGGX(NdotV, roughness);
    float ggx1 = GeometrySchlickGGX(NdotL, roughness);

    return ggx1 * ggx2;
}

// -----------
vec3 fresnelSchlick(float cosTheta, vec3 F0)
{
    return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
}
vec3 fresnelSchlickRoughness(float cosTheta, vec3 F0, float roughness)
{
    return F0 + (max(vec3(1.0 - roughness), F0) - F0) * pow(1.0 - cosTheta, 5.0);
}

void main()	{
    vec3 V = normalize(cameraPosition - vWorldPos);
    mat3 normspMat = NormalSpaceMat();
    vec2 newUV = displaceUV(normspMat, V);
    vec3 N = getNormal(normspMat, newUV);
    vec3 R = reflect(-V, N);
    
    // get all the necessary propreties
    vec4 albedo = GammaToLinear(texture2D(albedoMap, newUV), 2.2);
    float metallic = texture2D(metallicMap, newUV).r;
    float roughness = texture2D(roughMap, newUV).r;
    float ao = texture2D(aoMap, newUV).r;
    // shadow
    vec3 currentPos = vShadowSpacePos.xyz * 0.5 + 0.5;
    float curDepth = currentPos.z;
    float shadow = 0.;
    // float bias = max(0.002 * (1.0 - max(dot(N, directionalLights[0].direction), 0.)), 0.0001);
    float bias = 0.0015;
    int count = 0;
    float shadDepthCenter = texture2D(shadowMap, currentPos.xy).r;
    for (int i = -1; i <= 1; ++i)
    {
        for (int j = -1; j <= 1; ++j)
        {
            float shadDepth = texture2D(shadowMap, currentPos.xy + vec2(i, j) / 2048.).r;
            if ( shadDepthCenter - shadDepth < 0.0001)
            {
                shadow += curDepth - bias > shadDepth ? 1. : 0.;
                count ++;
            }
        }
    }
    shadow /= float(count);
    shadow = (1. - shadow * 0.5);
    // ------- end of shadow ----------
    vec3 F0 = vec3(0.04);
    F0 = mix(F0, albedo.xyz, metallic);
    vec3 color = vec3(0.);
    // directional lights
    for(int i = 0; i < NUM_DIR_LIGHTS; ++i)
    {
        vec3 L = directionalLights[i].direction;
        vec3 H = normalize(V + L);

        float NDF = DistributionGGX(N, H, roughness);
        float G = GeometrySmith(N, V, L, roughness);
        vec3 F = fresnelSchlick(max(dot(H, V), 0.), F0); // kS = F
        vec3 DGF = NDF * G * F;
        float denominator = 4. * max(dot(N, V), 0.) * max(dot(N, L), 0.) + 0.0001;
        vec3 specular = DGF / denominator;

        vec3 kD = (vec3(1.) - F) * (1. - metallic); // kS = F

        color += (kD * albedo.xyz / PI + specular * shadow) * max(dot(N, L), 0.) * directionalLights[i].color;
    }
    // ----------------environment lights, use high level textureCube instead--------------
    // vec3 Ks = fresnelSchlickRoughness(max(dot(N, V), 0.), F0, roughness);
    // specular
    vec3 lightColor = textureCube(envMap, vec3(-R.x, R.yz), roughness * 7.).rgb;

    vec3 F = fresnelSchlick(max(dot(N, V), 0.), F0); // suppose L = reflect(N, V)
    // float G = GeometrySmith(N, V, R, roughness);
    // vec3 DGF = G * F; // no D
    // float denominator = 4. * max(dot(N, V), 0.) * max(dot(N, R), 0.) + 0.0001;

    float k = (roughness + 1.)*(roughness + 1.) / 8.;
    float G = max(dot(N, V), 0.)*(1.-k)+k;
    G = 1. / (G * G);
    vec3 DGF = G * F; // no D
    float denominator = 4.;

    vec3 specular = DGF / denominator;
    color += specular * (0.4) * lightColor * shadow;
    // diffuse
    vec3 kD = (1.0 - F) * (1. - metallic);
    color += kD * textureCube(envMap, vec3(-N.x, N.yz), 7.).rgb * albedo.xyz * shadow;

    color *= ao;
    // --------------------------transparency---------------------------------
    vec3 H = normalize(V + delta * N);
    vec3 colorRefract = textureCube(envMap, vec3(H.x, -H.yz), roughness*roughness * 5.).rgb;
    colorRefract = mix(lightColor, colorRefract, max(dot(V, N), 0.)) * 0.85;
    color = mix(color, colorRefract, transparency*transparency);

    color = ReinhardToneMapping(color);
    gl_FragColor = LinearToGamma(vec4(color, albedo.a), 2.2);
    // gl_FragColor = textureCube(envMap, vec3(-N.x, N.yz)); // used for debug
    // gl_FragColor = vec4(vec3(normalize(transpose(normspMat) * V)), 1.);
}