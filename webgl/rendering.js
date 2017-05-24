window.Hand3D = (function() {

  var boneMatrices = null;

  function mat2s(mat) {
    var ret = "\n";
  
    for(var i = 0; i < 4; i++) {
        for(var j = 0; j < 4; j++)
          ret += mat[i * 4 + j].toFixed(2) + "\t";
        ret += "\n";
      }
    return ret;
  }

  var gl = (function() {

    var canvas = document.getElementById('canvas');
    canvas.style.position = 'fixed';

    var gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') || console.log('WebGL unsupported');

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    gl.viewport(0, 0, canvas.width, canvas.height);

    gl.uPerspectiveMatrix = mat4.create();
    mat4.perspective(gl.uPerspectiveMatrix, 45 / 180 * Math.PI, window.innerWidth / window.innerHeight, 0.01, 500.0);

    window.addEventListener('resize', function() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      gl.viewport(0, 0, canvas.width, canvas.height);
      mat4.perspective(gl.uPerspectiveMatrix, 45 / 180 * Math.PI, window.innerWidth / window.innerHeight, 0.01, 500.0);

    });

    return gl;

  }());

  var prog = (function(gl, attribs, uniforms) {

    var compileShader = function(source, type) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', source, false);
      xhr.send();

      var shader = gl.createShader(type);
      gl.shaderSource(shader, xhr.responseText);
      gl.compileShader(shader);
      console.log('Shader compilation:', gl.getShaderInfoLog(shader));

      return shader;
    }

    var program = gl.createProgram();
    gl.attachShader(program, compileShader('webgl/vertex.glsl', gl.VERTEX_SHADER));
    gl.attachShader(program, compileShader('webgl/fragment.glsl', gl.FRAGMENT_SHADER));

    gl.linkProgram(program);
    gl.useProgram(program);

    for(var i in attribs)
      program[attribs[i]] = gl.getAttribLocation(program, attribs[i]);

    for(var i in uniforms)
      program[uniforms[i]] = gl.getUniformLocation(program, uniforms[i]);

    return program;

  }(
    gl,
    ['aVertex', 'aNormal', 'aTexCoord', 'aSWeights', 'aSIndices'],
    ['uM', 'uV', 'uP', 'uN', 'uBones', 'uFlags', 'uSampler']
  ));

  var Mesh = (function(gl, program) {

    var Mesh = function(geometry) {

      var normGeometry = this.geometry = {
        vertices: [],
        indices: [],
        normals: [],
        uvs: [],
        skinIndices: [],
        skinWeights: [],
        bones: geometry.bones,
        keyframes: geometry.keyframes,
        rendering: geometry.rendering,
        position: geometry.position,
        rotate: geometry.rotate,
        scale: geometry.scale
      };

      for(var i = 0; i < geometry.uvindices.length; i++) {
      
        var index = geometry.uvindices[i];

        normGeometry.indices.push(i);

        normGeometry.vertices.push(geometry.vertices[index * 3]);
        normGeometry.vertices.push(geometry.vertices[index * 3 + 1]);
        normGeometry.vertices.push(geometry.vertices[index * 3 + 2]);

        normGeometry.normals.push(geometry.normals[index * 3]);
        normGeometry.normals.push(geometry.normals[index * 3 + 1]);
        normGeometry.normals.push(geometry.normals[index * 3 + 2]);

        if(geometry.uvs) {
          normGeometry.uvs.push(geometry.uvs[i * 2]);
          normGeometry.uvs.push(geometry.uvs[i * 2 + 1]);
        }

        if(geometry.skinIndices) {
          normGeometry.skinIndices.push(geometry.skinIndices[index * 2]);
          normGeometry.skinIndices.push(geometry.skinIndices[index * 2 + 1]);

          normGeometry.skinWeights.push(geometry.skinWeights[index * 2]);
          normGeometry.skinWeights.push(geometry.skinWeights[index * 2 + 1]);
        }

      }

      this.vertexBuffer  = gl.createBuffer();
      this.indexBuffer   = gl.createBuffer();
      this.normalBuffer  = gl.createBuffer();
      this.uvBuffer      = gl.createBuffer();
      this.skinIndicesBuffer  = gl.createBuffer();
      this.skinWeightsBuffer  = gl.createBuffer();

      this.uFlags = [0, 0, 0, 0];

      if(this.geometry.bones && this.geometry.bones.length) {
        this.uFlags[Mesh.FLAG_USE_SKINNING] = 1;

        for(var i = 0; i < this.geometry.bones.length; i++) {
          var bone = this.geometry.bones[i],
              localMatrix = mat4.create();

          mat4.fromRotationTranslation(localMatrix, bone.rot, bone.pos);

          bone.worldMatrix = mat4.create();
          bone.localMatrix = mat4.create();
          bone.inverseBindpose = mat4.create();

          mat4.copy(bone.localMatrix, localMatrix)

          if(bone.parent == -1) {
            mat4.copy(bone.worldMatrix, localMatrix)
          } else {
            mat4.multiply(bone.worldMatrix, this.geometry.bones[bone.parent].worldMatrix, localMatrix)
          }
          mat4.invert(bone.inverseBindpose, bone.worldMatrix);
        }

      }

      gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
      gl.bufferData(gl.ARRAY_BUFFER,
                    new Float32Array(this.geometry.vertices),
                    gl.STATIC_DRAW
                   );
      gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
      gl.bufferData(gl.ARRAY_BUFFER,
                    new Float32Array(this.geometry.normals),
                    gl.STATIC_DRAW
                   );
      gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
      gl.bufferData(gl.ARRAY_BUFFER,
                    new Float32Array(this.geometry.uvs),
                    gl.STATIC_DRAW
                   );
      gl.bindBuffer(gl.ARRAY_BUFFER, this.skinWeightsBuffer);
      gl.bufferData(gl.ARRAY_BUFFER,
                    new Float32Array(this.geometry.skinWeights),
                    gl.STATIC_DRAW
                   );
      gl.bindBuffer(gl.ARRAY_BUFFER, this.skinIndicesBuffer);
      gl.bufferData(gl.ARRAY_BUFFER,
                    new Float32Array(this.geometry.skinIndices),
                    gl.STATIC_DRAW
                   );
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
                    new Uint16Array(this.geometry.indices),
                    gl.STATIC_DRAW
                   );

      console.log(this.geometry.vertices.length / 3, this.geometry.uvs.length / 2);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    }

    Mesh.prototype.rotateFromQuats = function(quats) {

      if(quats === null) {
        handMesh.uFlags[Mesh.FLAG_USE_SKINNING] = 0;
        return null;
      }

      handMesh.uFlags[Mesh.FLAG_USE_SKINNING] = 1;

      var flat = [];

      var frames = [];

      for(var j = 0; j < quats.length; j++) {
        var bone = this.geometry.bones[j],
            boneq = quat.fromValues.apply(quat, bone.rot),
            parent = this.geometry.bones[j].parent,
            worldMatrix = frames[j] = mat4.create(),
            localMatrix = mat4.create(),
            lquat = quat.fromValues.apply(quat, quats[j]), //quat.create(),
            lvec = bone.pos; //vec3.create();

        quat.invert(boneq, boneq);
        quat.add(lquat, lquat, boneq);

        //quat.slerp(lquat, bone.rot, bone1.rot, this.curLerp);
        //vec3.lerp(lvec, bone.pos, bone1.pos, this.curLerp);

        mat4.fromRotationTranslation(localMatrix, lquat, lvec);

        if(parent == -1) {
          mat4.copy(worldMatrix, localMatrix);
        } else {
          mat4.multiply(worldMatrix, frames[parent], localMatrix);
        }
        mat4.copy(worldMatrix, localMatrix);

        var offsetMatrix = mat4.create();
        mat4.multiply(offsetMatrix, worldMatrix, this.geometry.bones[j].inverseBindpose);

        flat.push.apply(flat, offsetMatrix);
      }      

      return boneMatrices = new Float32Array(flat);
    }

    /*Mesh.prototype.getKeyframe = function() {

      this.curFrame += parseInt(this.curLerp);
      this.curLerp -= parseInt(this.curLerp);

      var flat = [];

      var kf  = this.geometry.keyframes[this.curFrame % this.geometry.keyframes.length],
          kf1 = this.geometry.keyframes[(this.curFrame + 1) % this.geometry.keyframes.length];
      var frames = [];

      for(var j = 0; j < kf.length; j++) {
        var bone = kf[j],
            bone1 = kf1[j],
            parent = this.geometry.bones[j].parent,
            worldMatrix = frames[j] = mat4.create(),
            localMatrix = mat4.create(),
            lquat = quat.create(),
            lvec = vec3.create();

        quat.slerp(lquat, bone.rot, bone1.rot, this.curLerp);
        vec3.lerp(lvec, bone.pos, bone1.pos, this.curLerp);

        mat4.fromRotationTranslation(localMatrix, lquat, lvec);

        if(parent == -1) {
          mat4.copy(worldMatrix, localMatrix);
        } else {
          mat4.multiply(worldMatrix, frames[parent], localMatrix);
        }

        var offsetMatrix = mat4.create();
        mat4.multiply(offsetMatrix, worldMatrix, this.geometry.bones[j].inverseBindpose);

        flat.push.apply(flat, offsetMatrix);
      }      

      return new Float32Array(flat);
    }*/

    Mesh.prototype.draw = function(baseMatrix) {
      var mvMatrix = mat4.create();
      var nMatrix  = mat3.create();

      if(typeof baseMatrix !== 'undefined') {
        mvMatrix = mat4.clone(baseMatrix);
      } else {
        mat4.identity(mvMatrix);
        mat4.translate(mvMatrix, mvMatrix, this.geometry.position);
        mat4.rotate(mvMatrix, mvMatrix,
                    this.geometry.rotate[0], [1.0, 0.0, 0.0]);
        mat4.rotate(mvMatrix, mvMatrix,
                    this.geometry.rotate[1], [0.0, 1.0, 0.0]);
        mat4.rotate(mvMatrix, mvMatrix,
                    this.geometry.rotate[2], [0.0, 0.0, 1.0]);
        mat4.scale(mvMatrix, mvMatrix,
                   this.geometry.scale || [0.6, 0.6, 0.6]);
      }

      mat3.normalFromMat4(nMatrix, mvMatrix);

      if(isNaN(this.curFrame))
        this.curFrame = 0;

      gl.uniform4iv(program.uFlags, this.uFlags);
      
      if(this.uFlags[Mesh.FLAG_USE_SKINNING] && boneMatrices !== null) {
        gl.uniformMatrix4fv(program.uBones, false, boneMatrices);
      }

      gl.uniformMatrix4fv(program.uM, false, mvMatrix);
      gl.uniformMatrix3fv(program.uN, false, nMatrix);

      gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
      gl.vertexAttribPointer(program.aVertex, 3, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(program.aVertex);

      gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
      gl.vertexAttribPointer(program.aNormal, 3, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(program.aNormal);

      if(this.uFlags[Mesh.FLAG_USE_TEXTURES]) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
        gl.vertexAttribPointer(program.aTexCoord, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(program.aTexCoord);
      }

      gl.bindBuffer(gl.ARRAY_BUFFER, this.skinWeightsBuffer);
      gl.vertexAttribPointer(program.aSWeights, 2, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(program.aSWeights);

      gl.bindBuffer(gl.ARRAY_BUFFER, this.skinIndicesBuffer);
      gl.vertexAttribPointer(program.aSIndices, 2, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(program.aSIndices);

      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);

      gl.drawElements(this.geometry.rendering,
                      this.geometry.indices.length,
                      gl.UNSIGNED_SHORT, 0
                     );

      gl.bindBuffer(gl.ARRAY_BUFFER, null);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    }

    Mesh.FLAG_USE_SKINNING = 0;
    Mesh.FLAG_USE_TEXTURES = 1;

    return Mesh;

  }(gl, prog));

  var uV = mat4.create();
  mat4.identity(uV);
  //mat4.translate(uV, uV, [0, -5, -12.0]);
  mat4.lookAt(uV, [0, 5, 12.0], [0, 4, 0], [0, 1, 0]);

  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.enable(gl.DEPTH_TEST);

  var curMesh = 0, curMeshf = 0.0, handMesh = null, meshes = [];

  (function() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'webgl/hand.json', false);
    xhr.send();

    var geom = JSON.parse(xhr.responseText);
    geom.rendering = gl.TRIANGLES;
    geom.position = [0, 4.0, 0];
    geom.rotate = [Math.PI / 2, 0, 0];
    geom.scale = [.5, .5, .5];
    
    handMesh = new Mesh(geom);
    handMesh.uFlags[Mesh.FLAG_USE_TEXTURES] = 0;
    handMesh.uFlags[Mesh.FLAG_USE_SKINNING] = 1;
  }());

  (function animate(time) {

    var delta = time - (animate.timeOld || time);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.uniformMatrix4fv(prog.uP, false, gl.uPerspectiveMatrix);
    gl.uniformMatrix4fv(prog.uV, false, uV);

    //handMesh.geometry.rotate[2] += 0.04;
    handMesh.draw();

    requestAnimationFrame(animate);
    animate.timeOld = time;

  }(0));

  return {
    set: function(quats) {
    
      handMesh.rotateFromQuats(quats);

    }
  };

}());
