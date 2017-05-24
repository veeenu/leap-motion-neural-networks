#define FLAG_USE_SKINNING 0
#define FLAG_USE_TEXTURES 1

uniform sampler2D uSampler;
uniform mat4 uP, uV, uM;
uniform mat4 uBones[32];
uniform mat3 uN;
uniform lowp ivec4 uFlags;

attribute vec3 aVertex, aNormal;

attribute vec2 aTexCoord;

attribute highp vec2 aSWeights;
attribute highp vec2 aSIndices;

varying vec3 vVertex, vNormal;
varying vec2 vTexCoord; 

mat4 boneTransform() {

  mat4 ret;
  float normfac = 1.0 / (aSWeights.x + aSWeights.y);

  ret = normfac * aSWeights.y * uBones[int(aSIndices.y)]
      + normfac * aSWeights.x * uBones[int(aSIndices.x)];

  return ret;
}

void main() {

  mat4 bt = (uFlags[FLAG_USE_SKINNING] > 0 && length(aSWeights) > 0.5)? 
    boneTransform() 
    : 
    mat4(
        1., 0., 0., 0.,
        0., 1., 0., 0.,
        0., 0., 1., 0.,
        0., 0., 0., 1.
    );

  gl_Position = uP * uV * uM * bt * vec4(aVertex, 1.0);
  vVertex = (bt * vec4(aVertex, 1.0)).xyz;
  vNormal = (bt * vec4(aNormal, 0.0)).xyz;
  vTexCoord = aTexCoord;

}
