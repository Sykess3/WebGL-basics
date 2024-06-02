'use strict';

let gl;                         // The webgl context.
let surface;                    // A surface model
//let shProgram;                  // A shader program
let spaceball;                  // A SimpleRotator object that lets the user rotate the view by mouse.
let lineProgram;
let line;
let segment;
let segmentProgram;
let image;
let textureModel;

let ModelRadius = 1;
let scale = 1.0;
let AmbientColor = [0.1, 0.1, 0.1];
let DiffuseColor = [1.0, 1.0, 1.0];
let SpecularColor = [0.97, 0.97, 0.97];
let Shininess = 12;
let LightIntensity = 1;
let World_X = 0;
let World_Y = 0;
let World_Z = -10;
let CameraPosition = [0, 0, -1]
let texturePoint = [0, 0]

let WorldOrigin = [0, 0, 0]
 
let LightPosition = [0, 0, 5]

let isAnimating = false;
let fps = 60;
let reqAnim;
let currentAnimationTime = 0;
let animationSpeed = 0;
let AnimationVelocity = [1, 1, 0];
let ShowPath = false;
let rotateValue = 0;
let plane; 
let camera;
let textureVID, video, track;
let useFilter = true;

function SwitchAnimation(){

    isAnimating = !isAnimating;
    if(!isAnimating){
        window.cancelAnimationFrame(reqAnim);
    }
    else{
        ExecuteAnimation();
    }

}

function GetNormalizedAnimVelocity(){
    return m4.normalize(AnimationVelocity);
}

function ExecuteAnimation(){
    if(!isAnimating){
        return;
    }
    let deltaTime = 10 / fps;
    sphereRotation.x = (Math.sin(currentAnimationTime / 500 * 100) * ModelRadius / 5);
    sphereRotation.y = (Math.cos(currentAnimationTime / 500 * 100) * ModelRadius / 5) * 1.2;
    sphereRotation.z = (Math.sin(currentAnimationTime / 500 * 100) * ModelRadius / 5) + (Math.cos(currentAnimationTime / 500 * 100) * ModelRadius / 4);

    audioPanner.setPosition(sphereRotation.x, sphereRotation.y, 0);
    audioPanner.setOrientation(0,0,0);

    currentAnimationTime += deltaTime;
    setTimeout(() => {
        reqAnim = window.requestAnimationFrame(ExecuteAnimation);    
    }, deltaTime);
}

function deg2rad(angle) {
    return angle * Math.PI / 180;
}

function Line(name, program){
    this.position = m4.translation(0, 0, 0);
    this.name = name;
    this.iLightDirectionLineBuffer = gl.createBuffer();
    this.program = program;

    this.BufferData = function (data){
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iLightDirectionLineBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STREAM_DRAW)
    }

    this.Draw = function (projectionViewMatrix) {
        this.program.Use();

        gl.uniformMatrix4fv(this.program.iModelViewProjectionMatrix, false, m4.multiply(projectionViewMatrix, this.position));
        gl.uniform4fv(this.program.iSolidColor, [0, 1, 0, 1]);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iLightDirectionLineBuffer);
        gl.vertexAttribPointer(this.program.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.program.iAttribVertex);

        gl.drawArrays(gl.LINE_STRIP, 0, 2);
    }
}

function Plane(program){

    this.iVertexBuffer = gl.createBuffer();
    this.iTextureBuffer = gl.createBuffer();
    this.countText = 0;
    this.count = 0;
    this.shProgram = program;

    this.shProgram.iAttribVertex = gl.getAttribLocation(this.shProgram.prog, "vertex");
    this.shProgram.iAttribTexture = gl.getAttribLocation(this.shProgram.prog, "texture");
    this.shProgram.iModelViewMatrix = gl.getUniformLocation(this.shProgram.prog, "ModelViewMatrix"); 
    this.shProgram.iProjectionMatrix = gl.getUniformLocation(this.shProgram.prog, "ProjectionMatrix");

    this.BufferData = function (vertices) {
        this.shProgram.Use();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);

        this.count = vertices.length / 3;
    }

    this.TextureBufferData = function (points) {
        this.shProgram.Use();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iTextureBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.STREAM_DRAW);

        this.countText = points.length / 2;
    }
    // Draw the surface
    this.Draw = function (modelViewProjection) {

        let rotation = m4.xRotate(m4.identity(),  3.14);
    
        let translation = m4.translation(-4, 2, -10);
    
        let modelMatrix = m4.multiply(translation, rotation);
        this.shProgram.Use();
        gl.bindTexture(gl.TEXTURE_2D, textureVID);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
        gl.uniformMatrix4fv(this.shProgram.iModelViewMatrix, false, modelMatrix);
        gl.uniformMatrix4fv(this.shProgram.iProjectionMatrix, false, modelViewProjection);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(this.shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.shProgram.iAttribVertex);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iTextureBuffer);
        gl.vertexAttribPointer(this.shProgram.iAttribTexture, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.shProgram.iAttribTexture);


        gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.count);
    }
}
let receivedInCurrentFrame = false;
/* Initialize the WebGL context. Called from init() */
function initGL() {

    video = document.createElement('video');
    video.setAttribute('autoplay', true);
    window.vid = video;
    //getWebcam();
    //CreateWebCamTexture();
    //createAudio();

    let prog = createProgram(gl, vertexShaderPlane, fragmentShaderPlane);
    let test = new ShaderProgram('Segment', prog);
    //plane = new Plane(test);
    test.Use();
    let planeSize = 4;
    /*plane.BufferData([
        0.0, 0.0, 0.0, 
        planeSize * 2 , planeSize, 0.0,
        planeSize * 2, 0.0, 0.0, 
        0.0, 0.0, 0.0, 
        planeSize * 2, planeSize, 0.0,
        0.0, planeSize, 0.0
    ]);*/
    /*plane.TextureBufferData([
        0.0, 0.0, // Bottom-left
        1.0, 1.0, // Top-right
        1.0, 0.0, // Bottom-right
        0.0, 0.0, // Bottom-left (repeat to close the quad)
        1.0, 1.0, // Top-right (repeat)
        0.0, 1.0  // Top-left
    ]);*/

    LoadTexture();

    window.addEventListener('deviceorientation', (event) => {
        //alert(`Audio Position:\nX: ${audioPosition.x}\nY: ${audioPosition.y}\nZ: ${audioPosition.z}`);
        if(receivedInCurrentFrame){
        return;
        }
        if(audioPanner) {
            audioPosition.x += deg2rad(event.alpha);
            audioPosition.y += deg2rad(event.beta);
            audioPosition.z += deg2rad(event.gamma);

    
            sphereRotation.x = 2 * Math.cos(audioPosition.y) * Math.cos(audioPosition.x);
            sphereRotation.y = 2 * Math.sin(audioPosition.y);
            sphereRotation.z = 2 * Math.cos(audioPosition.y) * Math.sin(audioPosition.z);

            receivedInCurrentFrame = true;
        }
    });

    setupUseFilterEvent();

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
}

// Constructor
function Model(name) {
    this.name = name;
    this.iVertexBuffer = gl.createBuffer();
    this.iNormalBuffer = gl.createBuffer();
    this.iTextureBuffer = gl.createBuffer();
    this.isSphere = false;

    this.count = 0;
    this.countTexture = 0;

    this.SetupSurface = function () {

        let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);
    
        this.shProgram = new ShaderProgram('Basic', prog);
        this.shProgram.Use();
        this.shProgram.iAttribVertex = gl.getAttribLocation(prog, "vertex");
        this.shProgram.iTextureCoords2D = gl.getAttribLocation(prog, "textureCoord");
        this.shProgram.iNormalVertex = gl.getAttribLocation(prog, "normal");
        this.shProgram.iWorldInverseTranspose = gl.getUniformLocation(prog, "WorldInverseTranspose");
        this.shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewProjectionMatrix");
        this.shProgram.iMatAmbientColor = gl.getUniformLocation(prog, "matAmbientColor");
        this.shProgram.iMatDiffuseColor = gl.getUniformLocation(prog, "matDiffuseColor");
        this.shProgram.iMatSpecularColor = gl.getUniformLocation(prog, "matSpecularColor");
        this.shProgram.iMatShininess = gl.getUniformLocation(prog, "matShininess");
        this.shProgram.iLSAmbientColor = gl.getUniformLocation(prog, "lsAmbientColor");
        this.shProgram.iLSDiffuseColor = gl.getUniformLocation(prog, "lsDiffuseColor");
        this.shProgram.iLSSpecularColor = gl.getUniformLocation(prog, "lsSpecularColor");
        this.shProgram.iIsSphere = gl.getUniformLocation(prog, "isSphere");

        this.shProgram.iLightDirection = gl.getUniformLocation(prog, "LightDirection");
        this.shProgram.iCamWorldPosition = gl.getUniformLocation(prog, "CamWorldPosition"); 
        this.shProgram.iTexture = gl.getUniformLocation(prog, "texture"); 
        this.shProgram.iRotationPoint = gl.getUniformLocation(prog, "rotationPoint");
        this.shProgram.iRotationValue = gl.getUniformLocation(prog, "rotationValue");
        this.shProgram.iPointVizualizationPosition = gl.getUniformLocation(prog, "pointVizualizationPosition");
        this.shProgram.iStereoMatrix = gl.getUniformLocation(prog, "StereoMatrix");
        this.shProgram.iAttribVertex = gl.getAttribLocation(prog, "vertex");
        this.shProgram.iAttribTexture = gl.getAttribLocation(prog, "texture");
        this.shProgram.iModelViewMatrix = gl.getUniformLocation(prog, "ModelViewMatrix"); 
        this.shProgram.iProjectionMatrix = gl.getUniformLocation(prog, "ProjectionMatrix");
    }
    
    this.BufferData = function (vertices) {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);

        this.count = vertices.length / 3;
    }

    this.BufferData = function (vertices, normals) {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STREAM_DRAW);

        this.count = vertices.length / 3;
    }

    this.TextureBufferData = function (textureCoords) {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iTextureBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoords), gl.STREAM_DRAW);

        this.countTexture = textureCoords.length / 2;
    }

    this.Draw = function (projectionViewMatrix, ProjectionMatrix, ModelViewMatrix) {

        this.shProgram.Use();
        if(!this.isSphere)
        {
            gl.bindTexture(gl.TEXTURE_2D, textureModel);
            gl.texImage2D(
                gl.TEXTURE_2D,
                0,
                gl.RGBA,
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                image
            );

        }

            /*  the view matrix from the SimpleRotator object.*/
        let rotation = spaceball.getViewMatrix();

        let translation;
        if(this.isSphere){
            translation = m4.translation(sphereRotation.x, sphereRotation.y, World_Z);
        }
        else{
            translation = m4.translation(World_X, World_Y, World_Z);
        }

        let modelMatrix;
        if(!this.isSphere)
            {
                modelMatrix = m4.multiply(translation, rotation);
        }
        else{
            modelMatrix = m4.multiply(translation, m4.identity());
        }
    
        /* Multiply the projection matrix times the modelview matrix to give the
           combined transformation matrix, and send that to the shader program. */
        let modelViewProjection = m4.multiply(projectionViewMatrix, modelMatrix);


        modelViewProjection = m4.multiply(modelViewProjection, ModelViewMatrix);
        let stereoMatrix = m4.multiply(ProjectionMatrix, translation);
        gl.uniformMatrix4fv(this.shProgram.iStereoMatrix, false, stereoMatrix);

        gl.uniform1i(this.shProgram.iIsSphere, this.isSphere);

        var worldInverseMatrix = m4.inverse(modelMatrix);
        var worldInverseTransposeMatrix = m4.transpose(worldInverseMatrix);
        gl.uniformMatrix4fv(this.shProgram.iModelViewProjectionMatrix, false, modelViewProjection);
        gl.uniformMatrix4fv(this.shProgram.iWorldInverseTranspose, false, worldInverseTransposeMatrix);
    
        if(!this.isSphere)
            {
                gl.uniform3fv(this.shProgram.iMatAmbientColor, AmbientColor);
                gl.uniform3fv(this.shProgram.iMatDiffuseColor, DiffuseColor);
                gl.uniform3fv(this.shProgram.iMatSpecularColor, SpecularColor);
                gl.uniform1f(this.shProgram.iMatShininess, Shininess);
            
                gl.uniform3fv(this.shProgram.iLSAmbientColor, [0.1, 0.1, 0.1]);
                gl.uniform3fv(this.shProgram.iLSDiffuseColor, [LightIntensity, LightIntensity, LightIntensity]);
                gl.uniform3fv(this.shProgram.iLSSpecularColor, [1, 1, 1]);
            
                gl.uniform3fv(this.shProgram.iCamWorldPosition, CameraPosition);
                gl.uniform3fv(this.shProgram.iLightDirection, GetDirLightDirection());
        
                //gl.uniform2fv(shProgram.iRotationPoint, texturePoint);
        
                let point = CalculateCorrugatedSpherePoint(map(texturePoint[0], 0, 1,phiMin, phiMax), map(texturePoint[1], 0, 1,vMin, vMax));
                gl.uniform3fv(this.shProgram.iPointVizualizationPosition, [point.x, point.y, point.z]);
                gl.uniform1f(this.shProgram.iRotationValue, rotateValue);
        
                gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
                gl.vertexAttribPointer(this.shProgram.iNormalVertex, 3, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(this.shProgram.iNormalVertex);
            
                gl.bindBuffer(gl.ARRAY_BUFFER, this.iTextureBuffer);
                gl.vertexAttribPointer(this.shProgram.iTextureCoords2D, 2, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(this.shProgram.iTextureCoords2D);
                gl.uniform1i(this.shProgram.iTexture, 0);
                gl.enable(gl.TEXTURE_2D);
            }

            gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
            gl.vertexAttribPointer(this.shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(this.shProgram.iAttribVertex);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.count);
    }
}


// Constructor
function ShaderProgram(name, program) {

    this.name = name;
    this.prog = program;

    this.iModelViewMatrix = -1;
    this.iAttribTexture = -1;
    this.iAttribVertex = -1;
    this.iProjectionMatrix = -1;

    this.iSolidColor = -1;
    this.iAttribVertex = -1;
    this.iNormalVertex = -1;
    this.iTextureCoords2D = -1;
    this.iTexture = -1;

    this.iModelViewProjectionMatrix = -1;
    this.iWorldInverseTranspose = -1;

    this.iLSAmbientColor = -1;
    this.iLSDiffuseColor = -1;
    this.iLSSpecularColor = -1;
    this.iIsSphere= -1;

    this.iMatAmbientColor = -1;
    this.iMatDiffuseColor = -1;
    this.iMatSpecularColor = -1;
    this.iMatShininess = -1;

    this.iLightDirection = -1;
    this.iCamWorldPosition = -1;

    this.iPointVizualizationPosition = -1;
    this.iRotationPoint = -1;
    this.iRotationValue = -1;

    this.iStereoMatrix;

    this.Use = function () {
        gl.useProgram(this.prog);
    }
}

function SwitchShowPath(){
    ShowPath = !ShowPath;
    draw();
}

function requestNewFrame() {
    receivedInCurrentFrame = false;
    draw();
    window.requestAnimationFrame(requestNewFrame);
}

let audioPlay;
function playMusic() {
    if (audioPlay) {
        audioContext.suspend();
        document.getElementById('play-audio-btn').textContent = 'Resume';
    } else {
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume();
        } else {
            createAudio();
        }
        document.getElementById('play-audio-btn').textContent = 'Stop';
    }
    audioPlay = !audioPlay;

    SwitchAnimation();
}


/* Draws a colored cube, along with a set of coordinate axes.
 * (Note that the use of the above drawPrimitive function is not an efficient
 * way to draw with WebGL.  Here, the geometry is so simple that it doesn't matter.)
 */
function draw() {

    if(surface == undefined){
        return;
    }

    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


    /* Set the values of the projection transformation */
    let projectionMatrix = m4.perspective(Math.PI / 8, 2, 1, 40);
    const viewMatrix = m4.lookAt(CameraPosition, WorldOrigin, [0, 1, 0]);
    const camRotation = m4.axisRotation([0, 1, 0], 179);
    const projectionViewMatrix = m4.multiply(projectionMatrix, viewMatrix);

    //lineProgram.Use();
    //line.Draw(projectionViewMatrix);

    if(ShowPath){
        segmentProgram.Use();
        segment.Draw(projectionMatrix);
    }

    ReadInput();
    
    gl.colorMask(true, true, true, true);
    //plane.Draw(projectionMatrix);

    gl.colorMask(true, false, false, false);
    camera.ApplyRightFrustum();
    surface.Draw(projectionMatrix, camera.mRightProjectionMatrix, camera.mRightModelViewMatrix);
    sphere.Draw(projectionMatrix, camera.mRightProjectionMatrix, camera.mRightModelViewMatrix);

    gl.clear(gl.DEPTH_BUFFER_BIT);

    camera.ApplyLeftFrustum();
    gl.colorMask(false, true, true, false);

    surface.Draw(projectionMatrix, camera.mLeftProjectionMatrix, camera.mLeftModelViewMatrix);
    sphere.Draw(projectionMatrix, camera.mLeftProjectionMatrix, camera.mLeftModelViewMatrix);
    
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.colorMask(true, true, true, true);

}

function GetDirLightDirection(){
    let test = m4.scaleVector(m4.normalize(LightPosition), -1); 
    return test;
}


let phiMax = Math.PI * 2;
let phiMin = 0;
let vMax = Math.PI * 0.5;
let vMin = 0;

function CreateSurfaceData() {
    let vertexList = [];
    let normalsList = [];
    let textureList = [];

    let phiStep = phiMax / 100;
    let vStep = vMax / 100;

    for (let phi = phiMin; phi < phiMax + phiStep; phi += phiStep) {
        for (let v = vMin; v < vMax + vStep; v += vStep) {
            let vert = CalculateCorrugatedSpherePoint(phi, v)
            let n1 = CalcAnalyticNormal(phi, v, vert)
            let avert = CalculateCorrugatedSpherePoint(phi + phiStep, v)
            let n2 = CalcAnalyticNormal(phi + phiStep, v, avert)
            let bvert = CalculateCorrugatedSpherePoint(phi, v + vStep)
            let n3 = CalcAnalyticNormal(phi, v + vStep, bvert)
            let cvert = CalculateCorrugatedSpherePoint(phi + phiStep, v + vStep)
            let n4 = CalcAnalyticNormal(phi + phiStep, v + vStep, cvert)

            let u1 = map(phi, 0, phiMax, 0, 1)
            let v1 = map(v, 0, vMax, 0, 1)
            textureList.push(u1, v1)
            u1 = map(phi + phiStep, 0, phiMax, 0, 1)
            textureList.push(u1, v1)
            u1 = map(phi, 0, phiMax, 0, 1)
            v1 = map(v + vStep, 0, vMax, 0, 1)
            textureList.push(u1, v1)
            u1 = map(phi + phiStep, 0, phiMax, 0, 1)
            v1 = map(v, 0, vMax, 0, 1)
            textureList.push(u1, v1)
            v1 = map(v + vStep, 0, vMax, 0, 1)
            textureList.push(u1, v1)
            u1 = map(phi, 0, phiMax, 0, 1)
            v1 = map(v + vStep, 0, vMax, 0, 1)
            textureList.push(u1, v1)
            

            vertexList.push(vert.x, vert.y, vert.z)
            normalsList.push(n1.x, n1.y, n1.z)
            vertexList.push(avert.x, avert.y, avert.z)
            normalsList.push(n2.x, n2.y, n2.z)
            vertexList.push(bvert.x, bvert.y, bvert.z)
            normalsList.push(n3.x, n3.y, n3.z)

            vertexList.push(avert.x, avert.y, avert.z)
            normalsList.push(n2.x, n2.y, n2.z)
            vertexList.push(cvert.x, cvert.y, cvert.z)
            normalsList.push(n4.x, n4.y, n4.z)
            vertexList.push(bvert.x, bvert.y, bvert.z)
            normalsList.push(n3.x, n3.y, n3.z)
        }
    }

    return [vertexList, normalsList, textureList];
}

function map(val, f1, t1, f2, t2) {
    let m;
    m = (val - f1) * (t2 - f2) / (t1 - f1) + f2
    return Math.min(Math.max(m, f2), t2);
}

function CalcAnalyticNormal(u, v, xyz)
{
    let DeltaU = 0.0001;
    let DeltaV = 0.0001;
    let uTangent = CalcDerivativeU(u, v, DeltaU, xyz)
    vec3Normalize(uTangent);
    let vTangent = CalcDerivativeV(u, v, DeltaV, xyz);
    vec3Normalize(vTangent);
    return vec3Cross(vTangent, uTangent);
}

function vec3Normalize(a) {
    var mag = Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
    a[0] /= mag; a[1] /= mag; a[2] /= mag;
}
function vec3Cross(a, b) {
    let x = a[1] * b[2] - b[1] * a[2];
    let y = a[2] * b[0] - b[2] * a[0];
    let z = a[0] * b[1] - b[0] * a[1];
    return { x: x, y: y, z: z }
}

function vec3Normalize(a) {
    var mag = Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
    a[0] /= mag; a[1] /= mag; a[2] /= mag;
}

function CalcDerivativeU(u, v, DeltaU, xyz) {
    let Dxyz = CalculateCorrugatedSpherePoint(u + DeltaU, v);

    let Dxdu = (Dxyz.x - xyz.x) / deg2rad(DeltaU);
    let Dydu = (Dxyz.y - xyz.y) / deg2rad(DeltaU);
    let Dzdu = (Dxyz.z - xyz.z) / deg2rad(DeltaU);

    return [Dxdu, Dydu, Dzdu];
}

function CalcDerivativeV(u, v, DeltaV, xyz) {
    let Dxyz = CalculateCorrugatedSpherePoint(u, v + DeltaV);

    let Dxdv = (Dxyz.x - xyz.x) / deg2rad(DeltaV);
    let Dydv = (Dxyz.y - xyz.y) / deg2rad(DeltaV);
    let Dzdv = (Dxyz.z - xyz.z) / deg2rad(DeltaV);

    return [Dxdv, Dydv, Dzdv];
}

function CalculateCorrugatedSpherePoint(phi, v) {
    let R = ModelRadius;
    let a = 0.24;
    let n = 6;
    let x = (R * Math.cos(v) - a * (1 - Math.sin(v)) * Math.abs(Math.cos(n * phi))) * Math.cos(phi);
    let y = (R * Math.cos(v) - a * (1 - Math.sin(v)) * Math.abs(Math.cos(n * phi))) * Math.sin(phi);
    let z = R * Math.sin(v);
    return { x, y, z };
}



function SetupSegment(){
    let prog = createProgram(gl, LineVertexShaderSource, LineFragmentShaderSource);

    segmentProgram = new ShaderProgram('Segment', prog);
    segmentProgram.Use();

    segmentProgram.iAttribVertex = gl.getAttribLocation(prog, "vertex");
    segmentProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewProjectionMatrix");
    segmentProgram.iSolidColor = gl.getUniformLocation(prog, "color");
}

function BuildSegment(){
    segment = new Line("Segment", segmentProgram);
    segment.BufferData([...m4.scaleVector(GetNormalizedAnimVelocity(), -ModelRadius * 0.95), ...m4.scaleVector(GetNormalizedAnimVelocity(), ModelRadius * 0.95)]);
    segment.position = m4.translation(0, 2, 0);
}

function SetupLine(){
    let prog = createProgram(gl, LineVertexShaderSource, LineFragmentShaderSource);

    lineProgram = new ShaderProgram('Line', prog);
    lineProgram.Use();

    lineProgram.iAttribVertex = gl.getAttribLocation(prog, "vertex");
    lineProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewProjectionMatrix");
    lineProgram.iSolidColor = gl.getUniformLocation(prog, "color");
}

function BuildLine(){
    line = new Line("Line", lineProgram);
    line.BufferData([...WorldOrigin, ...LightPosition])
}

let sphere;
function BuildSurface(){
    surface = new Model('Surface');
    let data = CreateSurfaceData();
    surface.BufferData(data[0], data[1]);
    surface.TextureBufferData(data[2]);
    surface.SetupSurface();

    sphere = new Model('Surface');
    sphere.isSphere = true;
    let spheredata = CreateSphere();
    sphere.BufferData(spheredata);
    sphere.SetupSurface();
}


let audioPosition = {
    x: 0,
    y: 0,
    z: 0
};

let sphereRotation = {
    x: 0,
    y: 0,
    z: 0
};
function CreateSphere()
{
    //sphereRotation.x = 0;
    //sphereRotation.y = 0;
    //sphereRotation.z = 0;
    let radius = 0.05;
    let vertexList = [];
    const stepU = 10;
    for (let u = 0; u <= 360; u += stepU) {
        for(let v = 0; v <= 360; v += stepU) {
            let alpha = deg2rad(u);
            let beta = deg2rad(v);
            let alpha2 = deg2rad(u + stepU);
            let beta2 = deg2rad(v + stepU);
            vertexList.push(sphereRotation.x +  (radius *  Math.cos(alpha) * Math.sin(beta)),sphereRotation.y +
                (radius *  Math.sin(alpha) * Math.sin(beta)),sphereRotation.z + (radius *  Math.cos(beta)));
            vertexList.push(sphereRotation.x +  (radius *  Math.cos(alpha2) * Math.sin(beta2)),sphereRotation.y +
                (radius *  Math.sin(alpha2) * Math.sin(beta2)),sphereRotation.z + (radius *  Math.cos(beta2)));
        }
    }
    return vertexList;
}


/* Creates a program for use in the WebGL context gl, and returns the
 * identifier for that program.  If an error occurs while compiling or
 * linking the program, an exception of type Error is thrown.  The error
 * string contains the compilation or linking error.  If no error occurs,
 * the program identifier is the return value of the function.
 * The second and third parameters are strings that contain the
 * source code for the vertex shader and for the fragment shader.
 */
function createProgram(gl, vShader, fShader) {
    let vsh = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vsh, vShader);
    gl.compileShader(vsh);
    if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
    }
    let fsh = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fsh, fShader);
    gl.compileShader(fsh);
    if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
    }
    let prog = gl.createProgram();
    gl.attachShader(prog, vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
    }
    return prog;
}


/**
 * initialization function that will be called when the page has loaded
 */
function init() {
    camera = new StereoCamera(50, 0.2, 1, Math.PI / 8, 2, 50)
    let canvas;
    try {
        canvas = document.getElementById("webglcanvas");
        gl = canvas.getContext("webgl");
        if (!gl) {
            throw "Browser does not support WebGL";
        }
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not get a WebGL graphics context.</p>";
        return;
    }
    try {
        initGL();  // initialize the WebGL graphics context
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
        return;
    }

    spaceball = new TrackballRotator(canvas, draw, 0);

    canvas.onmousewheel = function (event) {
        if (+(scale - (Math.round(event.wheelDelta / 150) / 10.0)).toFixed(1) < 0.0 || +(scale - (Math.round(event.wheelDelta / 150) / 10.0)).toFixed(1) > 2.0) {
            return false;
        }
        scale -= ((event.wheelDelta / 150) / 10.0);
        draw();
        return false;
    };

    //draw();
}


window.onkeydown = (e) => {
    switch (e.keyCode) {
        case 65:
            texturePoint[0] += 0.01;
            break;
        case 68:
            texturePoint[0] -= 0.01;
            break;
        case 87:
            texturePoint[1] += 0.01;
            break;
        case 83:
            texturePoint[1] -= 0.01;
            break;
    }
    texturePoint[1] = Math.max(0.001, Math.min(texturePoint[1], 0.999))

    if(texturePoint[0] >= 1){
        texturePoint[0] = 0.001;
    }
    else if(texturePoint[0] <= 0){
        texturePoint[0] = 0.99;
    }
    draw();
}


let isLoadedTexture = false;

function LoadTexture() {
    textureModel = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, textureModel);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    image = new Image();
    image.crossOrigin = 'anonymus';

    image.src = "https://raw.githubusercontent.com/Sykess3/WebGL-basics/CGW/texture.jpg";
    image.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, textureModel);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            image
        );

        BuildSurface();
    
        SetupLine();
        BuildLine();
    
        SetupSegment();
        BuildSegment();

        requestNewFrame();
    }
}

function StereoCamera(
    Convergence,
    EyeSeparation,
    AspectRatio,
    FOV,
    NearClippingDistance,
    FarClippingDistance
) {
    this.mConvergence = Convergence;
    this.mEyeSeparation = EyeSeparation;
    this.mAspectRatio = AspectRatio;
    this.mFOV = FOV;
    this.mNearClippingDistance = NearClippingDistance;
    this.mFarClippingDistance = FarClippingDistance;

    this.mLeftProjectionMatrix = null;
    this.mRightProjectionMatrix = null;

    this.mLeftModelViewMatrix = null;
    this.mRightModelViewMatrix = null;

    this.ApplyLeftFrustum = function () {
        let top, bottom, left, right;
        top = this.mNearClippingDistance * Math.tan(this.mFOV / 2);
        bottom = -top;

        let a = this.mAspectRatio * Math.tan(this.mFOV / 2) * this.mConvergence;
        let b = a - this.mEyeSeparation / 2;
        let c = a + this.mEyeSeparation / 2;

        left = (-b * this.mNearClippingDistance) / this.mConvergence;
        right = (c * this.mNearClippingDistance) / this.mConvergence;

        // Set the Projection Matrix
        this.mLeftProjectionMatrix = m4.frustum(
            left,
            right,
            bottom,
            top,
            this.mNearClippingDistance,
            this.mFarClippingDistance
        );

        // Displace the world to right
        this.mLeftModelViewMatrix = m4.translation(
            this.mEyeSeparation / 2,
            0.0,
            0.0
        );
    };

    this.ApplyRightFrustum = function () {
        let top, bottom, left, right;
        top = this.mNearClippingDistance * Math.tan(this.mFOV / 2);
        bottom = -top;

        let a = this.mAspectRatio * Math.tan(this.mFOV / 2) * this.mConvergence;
        let b = a - this.mEyeSeparation / 2;
        let c = a + this.mEyeSeparation / 2;

        left = (-c * this.mNearClippingDistance) / this.mConvergence;
        right = (b * this.mNearClippingDistance) / this.mConvergence;

        // Set the Projection Matrix
        this.mRightProjectionMatrix = m4.frustum(
            left,
            right,
            bottom,
            top,
            this.mNearClippingDistance,
            this.mFarClippingDistance
        );

        // Displace the world to left
        this.mRightModelViewMatrix = m4.translation(
            -this.mEyeSeparation / 2,
            0.0,
            0.0
        );
    };
}

function getWebcam() {
    let constraints = {video: true, audio: false};
    navigator.getUserMedia(constraints, function (stream) {
        video.srcObject = stream;
    }, function (e) {
        console.error('Can\'t find a Web camera', e);
    });
}

function CreateWebCamTexture() {
    textureVID = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, textureVID);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}

function ReadInput() {
    let eyeSeparation = document.getElementById("eyeSeparation").value;
    camera.mEyeSeparation = eyeSeparation;

    let fieldOfView = document.getElementById("fieldOfView").value;
    camera.mFOV = fieldOfView;

    let nearClippingDistance = document.getElementById("nearClippingDistance").value;
    camera.mNearClippingDistance = parseFloat(nearClippingDistance);

    let convergence = document.getElementById("convergenceDistance").value;
    camera.mConvergence = convergence;
}

let audioContext;
let audioSource;
function createAudio() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    audioSource = audioContext.createBufferSource();
    createHighpassFilter();
    createAudioPanner();
    
    const request = new XMLHttpRequest();
    request.open("GET", "https://raw.githubusercontent.com/Sykess3/WebGL-basics/CGW/sound.mp3", true);
    request.responseType = "arraybuffer";
    request.onload = () => {
        const audioData = request.response;
        audioContext.decodeAudioData(audioData, (buffer) => {
            audioSource.buffer = buffer;
            if (useFilter) {
                audioSource.connect(audioFilter);
                audioFilter.connect(audioPanner);
            } else {
                audioSource.connect(audioPanner);
            }
            audioPanner.connect(audioContext.destination);
            audioSource.loop = true;
            audioSource.start(0); 
        }, (err) => {alert(err)});
    };
    request.send();
}

let audioFilter;
function createHighpassFilter() {
    audioFilter = audioContext.createBiquadFilter();
    audioFilter.type = "highpass";
    audioFilter.frequency.value = 1000;
    audioFilter.Q.value = 1;
}


let audioPanner;
function createAudioPanner() {
    audioPanner = audioContext.createPanner();
    audioPanner.panningModel = "HRTF";
    audioPanner.distanceModel = "inverse";
    audioPanner.refDistance = 1;
    audioPanner.maxDistance = 1000;
    audioPanner.rolloffFactor = 1;
    audioPanner.coneInnerAngle = 360;
    audioPanner.coneOuterAngle = 0;
    audioPanner.coneOuterGain = 0;
}

function setupUseFilterEvent() {
    const checkbox = document.getElementById('useFilter');
    checkbox.addEventListener('change', (event) => {
        if (event.target.checked) {
            useFilter = true;
            if (audioContext) {
                audioSource.disconnect();
                audioPanner.disconnect();
                audioSource.connect(audioFilter);
                audioFilter.connect(audioPanner);
                audioFilter.connect(audioContext.destination);
            }
        } else {
            useFilter = false;
            if (audioContext) {
                audioSource.disconnect();
                audioPanner.disconnect();
                audioSource.connect(audioPanner);
                audioPanner.connect(audioContext.destination);
            }
        }
    });
}