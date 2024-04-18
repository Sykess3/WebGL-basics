'use strict';

let gl;                         // The webgl context.
let surface;                    // A surface model
let shProgram;                  // A shader program
let spaceball;                  // A SimpleRotator object that lets the user rotate the view by mouse.
let lineProgram;
let line;
let segment;
let segmentProgram;

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

let camera

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
    let deltaTime = 1000 / fps;
    LightPosition[0] = (Math.sin(currentAnimationTime / 500) * 2 * ModelRadius * GetNormalizedAnimVelocity()[0]);
    LightPosition[1] = (Math.sin(currentAnimationTime / 500) * 2 * ModelRadius * GetNormalizedAnimVelocity()[1]);

    BuildLine();
    draw();
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
// Constructor
function Model(name) {
    this.name = name;
    this.iVertexBuffer = gl.createBuffer();
    this.iNormalBuffer = gl.createBuffer();
    this.iTextureBuffer = gl.createBuffer();

    this.count = 0;
    this.countTexture = 0;

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

            /*  the view matrix from the SimpleRotator object.*/
        let rotation = spaceball.getViewMatrix();
    
        let translation = m4.translation(World_X, World_Y, World_Z);
    
        let modelMatrix = m4.multiply(translation, rotation);
    
        /* Multiply the projection matrix times the modelview matrix to give the
           combined transformation matrix, and send that to the shader program. */
        let modelViewProjection = m4.multiply(projectionViewMatrix, modelMatrix);
        modelViewProjection = m4.multiply(modelViewProjection, ModelViewMatrix);

        let test = m4.multiply(ProjectionMatrix, translation);
        gl.uniformMatrix4fv(shProgram.iStereoMatrix, false, test);

        var worldInverseMatrix = m4.inverse(modelMatrix);
        var worldInverseTransposeMatrix = m4.transpose(worldInverseMatrix);
        gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection);
        gl.uniformMatrix4fv(shProgram.iWorldInverseTranspose, false, worldInverseTransposeMatrix);
    
        gl.uniform3fv(shProgram.iMatAmbientColor, AmbientColor);
        gl.uniform3fv(shProgram.iMatDiffuseColor, DiffuseColor);
        gl.uniform3fv(shProgram.iMatSpecularColor, SpecularColor);
        gl.uniform1f(shProgram.iMatShininess, Shininess);
    
        gl.uniform3fv(shProgram.iLSAmbientColor, [0.1, 0.1, 0.1]);
        gl.uniform3fv(shProgram.iLSDiffuseColor, [LightIntensity, LightIntensity, LightIntensity]);
        gl.uniform3fv(shProgram.iLSSpecularColor, [1, 1, 1]);
    
        gl.uniform3fv(shProgram.iCamWorldPosition, CameraPosition);
        gl.uniform3fv(shProgram.iLightDirection, GetDirLightDirection());

        gl.uniform2fv(shProgram.iRotationPoint, texturePoint);

        let point = CalculateCorrugatedSpherePoint(map(texturePoint[0], 0, 1,phiMin, phiMax), map(texturePoint[1], 0, 1,vMin, vMax));
        gl.uniform3fv(shProgram.iPointVizualizationPosition, [point.x, point.y, point.z]);
        gl.uniform1f(shProgram.iRotationValue, rotateValue);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
        gl.vertexAttribPointer(shProgram.iNormalVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iNormalVertex);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iTextureBuffer);
        gl.vertexAttribPointer(shProgram.iTextureCoords2D, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iTextureCoords2D);
        gl.uniform1i(shProgram.iTexture, 0);
        gl.enable(gl.TEXTURE_2D);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.count);
    }
}


// Constructor
function ShaderProgram(name, program) {

    this.name = name;
    this.prog = program;

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


/* Draws a colored cube, along with a set of coordinate axes.
 * (Note that the use of the above drawPrimitive function is not an efficient
 * way to draw with WebGL.  Here, the geometry is so simple that it doesn't matter.)
 */
function draw() {
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


    /* Set the values of the projection transformation */
    let projectionMatrix = m4.perspective(Math.PI / 8, 2, 1, 40);
    const viewMatrix = m4.lookAt(CameraPosition, WorldOrigin, [0, 1, 0]);
    const camRotation = m4.axisRotation([0, 1, 0], 179);
    const projectionViewMatrix = m4.multiply(projectionMatrix, m4.multiply(viewMatrix, camRotation));

    //lineProgram.Use();
    //line.Draw(projectionViewMatrix);

    if(ShowPath){
        segmentProgram.Use();
        segment.Draw(projectionViewMatrix);
    }
    
    shProgram.Use()
    ReadInput();

    gl.colorMask(false, true, true, false);
    camera.ApplyRightFrustum();
    surface.Draw(projectionViewMatrix, camera.mRightProjectionMatrix, camera.mRightModelViewMatrix);

    gl.clear(gl.DEPTH_BUFFER_BIT);

    camera.ApplyLeftFrustum();
    gl.colorMask(true, false, false, false);
    surface.Draw(projectionViewMatrix, camera.mLeftProjectionMatrix, camera.mLeftModelViewMatrix);

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



/* Initialize the WebGL context. Called from init() */
function initGL() {


    LoadTexture();

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
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

function BuildSurface(){
    surface = new Model('Surface');
    let data = CreateSurfaceData();
    surface.BufferData(data[0], data[1]);
    surface.TextureBufferData(data[2]);
}

function SetupSurface(){

    let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);

    shProgram = new ShaderProgram('Basic', prog);
    shProgram.Use();

    shProgram.iAttribVertex = gl.getAttribLocation(prog, "vertex");
    shProgram.iTextureCoords2D = gl.getAttribLocation(prog, "textureCoord");

    shProgram.iNormalVertex = gl.getAttribLocation(prog, "normal");

    shProgram.iWorldInverseTranspose = gl.getUniformLocation(prog, "WorldInverseTranspose");
    shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewProjectionMatrix");

    shProgram.iMatAmbientColor = gl.getUniformLocation(prog, "matAmbientColor");
    shProgram.iMatDiffuseColor = gl.getUniformLocation(prog, "matDiffuseColor");
    shProgram.iMatSpecularColor = gl.getUniformLocation(prog, "matSpecularColor");
    shProgram.iMatShininess = gl.getUniformLocation(prog, "matShininess");

    shProgram.iLSAmbientColor = gl.getUniformLocation(prog, "lsAmbientColor");
    shProgram.iLSDiffuseColor = gl.getUniformLocation(prog, "lsDiffuseColor");
    shProgram.iLSSpecularColor = gl.getUniformLocation(prog, "lsSpecularColor");

    shProgram.iLightDirection = gl.getUniformLocation(prog, "LightDirection");
    shProgram.iCamWorldPosition = gl.getUniformLocation(prog, "CamWorldPosition"); 

    shProgram.iTexture = gl.getUniformLocation(prog, "texture"); 
    shProgram.iRotationPoint = gl.getUniformLocation(prog, "rotationPoint");
    shProgram.iRotationValue = gl.getUniformLocation(prog, "rotationValue");
    shProgram.iPointVizualizationPosition = gl.getUniformLocation(prog, "pointVizualizationPosition");

    shProgram.iStereoMatrix = gl.getUniformLocation(prog, "StereoMatrix");
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
    let texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    const image = new Image();
    image.crossOrigin = 'anonymus';

    image.src = "https://raw.githubusercontent.com/Sykess3/WebGL-basics/CGW/texture.jpg";
    image.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            image
        );

        SetupSurface();
        BuildSurface();
    
        SetupLine();
        BuildLine();
    
        SetupSegment();
        BuildSegment();


        draw()
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

