var trackobject = 0;
var object_x_WCS = [0.0]; //default with origin
var object_y_WCS = [0.0]; //default with origin
var object_z_WCS = [0];

function onclick(screen_x, screen_y){
    //trackobject++;
    console.log(screen_x);
    x = Math.random() * 8;
    y = Math.random() * 8;
    z = 0;

    // Have push x/(some function of camera position)
    // Have push y/-(some^ function of camera position)
    object_x_WCS.push(x);
    object_y_WCS.push(y);
    object_z_WCS.push(z);
}

class Assignment_Two_Skeleton extends Scene_Component {
    // The scene begins by requesting the camera, shapes, and materials it will need.
    constructor(context, control_box) {
        super(context, control_box);

        // First, include a secondary Scene that provides movement controls:
        if(!context.globals.has_controls)
            context.register_scene_component(new Movement_Controls(context, control_box.parentElement.insertCell()));

        // Locate the camera here (inverted matrix).
        const r = context.width / context.height;
        context.globals.graphics_state.camera_transform = Mat4.translation([0, 0, -35]);
        context.globals.graphics_state.projection_transform = Mat4.perspective(Math.PI / 4, r, .1, 1000);

        this.trans = false;
        // At the beginning of our program, load one of each of these shape
        // definitions onto the GPU.  NOTE:  Only do this ONCE per shape
        // design.  Once you've told the GPU what the design of a cube is,
        // it would be redundant to tell it again.  You should just re-use
        // the one called "box" more than once in display() to draw
        // multiple cubes.  Don't define more than one blueprint for the
        // same thing here.
        const shapes = {
            'square': new Square(),
            'circle': new Circle(15),
            'pyramid': new Tetrahedron(false),
            'simplebox': new SimpleCube(),
            'box': new Cube(),
            'cylinder': new Cylinder(15),
            'cone': new Cone(20),
            'ball': new Subdivision_Sphere(4),
            'tailfin': new tailfin()    ////////////////////////////Create tailfin shape in here
        }
        this.submit_shapes(context, shapes);
        this.shape_count = Object.keys(shapes).length;
        
        //this.MeshBasicMaterial( { side:THREE.BackSide,map:texture, depthWrite: false, depthTest: false });

        // Make some Material objects available to you:
        this.test = context.get_instance(Phong_Shader).material(Color.of(.9, .5, .9, 1), {
            ambient: 0.4, //how might light goes through it
            diffusivity: .4, //brightness facing light i think
            //specularity: 0 // l -> r gradient
        });
        

		this.clay = context.get_instance(Phong_Shader2).material(Color.of(.2, .5, .1, 1), {
            ambient: .4,
            diffusivity: .4,
            depthTest: false
        });
        
        this.plastic = this.clay.override({
            specularity: .6
        });

        this.texture_base = context.get_instance(Phong_Shader).material(Color.of(0, 0, 0, 1), {
            ambient: 1,
            diffusivity: 0.4,
            specularity: 0.3
        });

        // Load some textures for the demo shapes
        this.shape_materials = {};
        const shape_textures = {
            square: "assets/even-dice-cubemap.png",
            box: "assets/even-dice-cubemap.png",
            ball: "assets/soccer_sph_s_resize.png",
            cylinder: "assets/treebark.png",
            pyramid: "assets/tetrahedron-texture2.png",
            simplebox: "assets/tetrahedron-texture2.png",
            cone: "assets/hypnosis.jpg",
            circle: "assets/hypnosis.jpg",
            tailfin: "assets/fish2.jpg",    //Location of tailfin texture
            fishfood:  "assets/fishfood.png"
        };
        for (let t in shape_textures)
            this.shape_materials[t] = this.texture_base.override({
                texture: context.get_instance(shape_textures[t])
            });
        
        this.lights = [new Light(Vec.of(10, 10, 20, 1), Color.of(1, .4, 1, 1), 100000)];

        this.t = 0;
    }


    // Draw the scene's buttons, setup their actions and keyboard shortcuts, and monitor live measurements.
    make_control_panel() {
        this.key_triggered_button("Pause Time", ["n"], () => {
            this.paused = !this.paused;
        });
    }

    draw_legs(graphics_state, model_transform, x, y){
         this.shapes['box'].draw(
               graphics_state,
               model_transform.times(Mat4.translation([9 * x, 0, 4 * y])).times(Mat4.scale([1,10,1])),
               this.shape_materials['cylinder']);
    }

    detectLeftButton(evt) {
        evt = evt || window.event;
        if ("buttons" in evt) {
            return evt.buttons == 1;
        }
        var button = evt.which || evt.button;
        return button == 1;
    }

    display(graphics_state) {
        // Use the lights stored in this.lights.
        graphics_state.lights = this.lights;
                
        // Find how much time has passed in seconds, and use that to place shapes.
        if (!this.paused)
            this.t += graphics_state.animation_delta_time / 1000;
        const t = this.t;

        let center = Mat4.identity();
        
        //legs
        this.draw_legs(graphics_state, center, 1, 1);
        this.draw_legs(graphics_state, center, 1, -1);
        this.draw_legs(graphics_state, center, -1, 1);
        this.draw_legs(graphics_state, center, -1,-1);

        //tabletop
        this.shapes['box'].draw(
            graphics_state, 
            center.times(Mat4.translation([0,10 + 0.5,0])).times(Mat4.scale([10, 0.5,5])),
            this.shape_materials['cylinder']
           // this.clay
        )

        ////////////////////////draw all objects, their coordinates are stored in the global variables on the top of this file
        var i;
        for(i = 0; i < object_x_WCS.length; i++){
            let m = Mat4.translation(Vec.of(object_x_WCS[i], object_y_WCS[i], object_z_WCS[i]));
            let transformMat = Mat4.translation(Vec.of(object_x_WCS[i], object_y_WCS[i], object_z_WCS[i]));
            let WCS = transformMat.times( Vec.of(0,0,0).to4(1));
            this.shapes.ball.draw(
                graphics_state,
                transformMat.times(Mat4.translation(Vec.of(0,15,0))),
                this.shape_materials["fishfood"] || this.plastic
           );
        }
        
        this.shapes.tailfin.draw(
            graphics_state,
            center.times(Mat4.translation(Vec.of(5,15,0))),
            this.shape_materials["tailfin"] || this.plastic
         );

/* 
        //test obj for transparency
        this.shapes['box'].draw(
            graphics_state, 
            center.times(Mat4.translation([0,11 + 5 ,0])).times(Mat4.scale([2, 2,2])),
            this.shape_materials['cylinder']
        )

       
        this.shapes['box'].draw(
            graphics_state, 
            center.times(Mat4.translation([0 ,0 ,0])),
            this.shape_materials['cylinder']
        )

        this.shapes['box'].draw(
            graphics_state, 
            center.times(Mat4.translation([0,11 + 5 ,0])).times(Mat4.scale([10, 5,5])),
            this.clay
        )

*/
    }
}

window.Assignment_Two_Skeleton = window.classes.Assignment_Two_Skeleton = Assignment_Two_Skeleton;

class test extends Scene_Component {
    // The scene begins by requesting the camera, shapes, and materials it will need.
    constructor(context, control_box) {
        super(context, control_box);

        // First, include a secondary Scene that provides movement controls:
        if(!context.globals.has_controls)
            context.register_scene_component(new Movement_Controls(context, control_box.parentElement.insertCell()));

        // Locate the camera here (inverted matrix).
        const r = context.width / context.height;
        context.globals.graphics_state.camera_transform = Mat4.translation([0, 0, -35]);
        context.globals.graphics_state.projection_transform = Mat4.perspective(Math.PI / 4, r, .1, 1000);
        this.trans = true;
        // At the beginning of our program, load one of each of these shape
        // definitions onto the GPU.  NOTE:  Only do this ONCE per shape
        // design.  Once you've told the GPU what the design of a cube is,
        // it would be redundant to tell it again.  You should just re-use
        // the one called "box" more than once in display() to draw
        // multiple cubes.  Don't define more than one blueprint for the
        // same thing here.
        const shapes = {
            'square': new Square(),
            'circle': new Circle(15),
            'pyramid': new Tetrahedron(false),
            'simplebox': new SimpleCube(),
            'box': new Cube(),
            'cylinder': new Cylinder(15),
            'cone': new Cone(20),
            'ball': new Subdivision_Sphere(4)
        }
        this.submit_shapes(context, shapes);
        this.shape_count = Object.keys(shapes).length;
        
        //this.MeshBasicMaterial( { side:THREE.BackSide,map:texture, depthWrite: false, depthTest: false });

        // Make some Material objects available to you:
        this.test = context.get_instance(Phong_Shader).material(Color.of(.9, .5, .9, 1), {
            ambient: 0.4, //how might light goes through it
            diffusivity: .4, //brightness facing light i think
            //specularity: 0 // l -> r gradient
        });
        

		this.clay = context.get_instance(Phong_Shader2).material(Color.of(.2, .5, .1, 1), {
            ambient: .4,
            diffusivity: .4,
            depthTest: false
        });
        
        this.plastic = this.clay.override({
            specularity: .6
        });

        this.texture_base = context.get_instance(Phong_Shader).material(Color.of(0, 0, 0, 1), {
            ambient: 1,
            diffusivity: 0.4,
            specularity: 0.3
        });

        // Load some textures for the demo shapes
        this.shape_materials = {};
        const shape_textures = {
            square: "assets/even-dice-cubemap.png",
            box: "assets/even-dice-cubemap.png",
            ball: "assets/glass.png",
            cylinder: "assets/treebark.png",
            pyramid: "assets/tetrahedron-texture2.png",
            simplebox: "assets/tetrahedron-texture2.png",
            cone: "assets/hypnosis.jpg",
            circle: "assets/hypnosis.jpg"
        };
        for (let t in shape_textures)
            this.shape_materials[t] = this.texture_base.override({
                texture: context.get_instance(shape_textures[t])
            });
        
        this.lights = [new Light(Vec.of(10, 10, 20, 1), Color.of(1, .4, 1, 1), 100000)];

        this.t = 0;
    }


    // Draw the scene's buttons, setup their actions and keyboard shortcuts, and monitor live measurements.
    make_control_panel() {
        this.key_triggered_button("Pause Time", ["n"], () => {
            this.paused = !this.paused;
        });
    }

    draw_legs(graphics_state, model_transform, x, y){
         this.shapes['box'].draw(
               graphics_state,
               model_transform.times(Mat4.translation([9 * x, 0, 4 * y])).times(Mat4.scale([1,10,1])),
               //model_transform.times(Mat4.scale([2,10,2])),
               this.shape_materials['cylinder']);
    }

    display(graphics_state) {
        // Use the lights stored in this.lights.
        graphics_state.lights = this.lights;
        
        // Find how much time has passed in seconds, and use that to place shapes.
        if (!this.paused)
            this.t += graphics_state.animation_delta_time / 1000;
        const t = this.t;


        let center = Mat4.identity();

        this.shapes['box'].draw(
            graphics_state, 
            center.times(Mat4.translation([0,11 + 5 ,0])).times(Mat4.scale([10, 5,5])),
            this.shape_materials['ball']
        )
    }
}

window.test = window.classes.test = test;


//*******************************PHONG2
window.Phong_Shader2 = window.classes.Phong_Shader2 = class Phong_Shader2 extends Shader {
    
    // Define an internal class "Material" that stores the standard settings found in Phong lighting.
    material(color, properties) {
        // Possible properties: ambient, diffusivity, specularity, smoothness, texture.
        return new class Material {
            constructor(shader, color=Color.of(0, 0, 0, 1), ambient=0, diffusivity=1, specularity=1, smoothness=40) {
                // Assign defaults.
                Object.assign(this, {
                    shader,
                    color,
                    ambient,
                    diffusivity,
                    specularity,
                    smoothness
                });

                // Optionally override defaults.
                Object.assign(this, properties);
            }

            // Easily make temporary overridden versions of a base material, such as
            // of a different color or diffusivity.  Use "opacity" to override only that.
            override(properties) {
                const copied = new this.constructor();
                Object.assign(copied, this);
                Object.assign(copied, properties);
                copied.color = copied.color.copy();
                if (properties["opacity"] != undefined)
                    copied.color[3] = properties["opacity"];
                return copied;
            }
        }
        (this,color);
    }

    // We'll pull single entries out per vertex by field name.  Map
    // those names onto the vertex array names we'll pull them from.
    map_attribute_name_to_buffer_name(name) {
        // Use a simple lookup table.
        return {
            object_space_pos: "positions",
            normal: "normals",
            tex_coord: "texture_coords"
        }[name];
    }
    
    // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
    shared_glsl_code() 
    {
        return `
            precision mediump float;

            // We're limited to only so many inputs in hardware.  Lights are costly (lots of sub-values).
            const int N_LIGHTS = 2;
            uniform float ambient, diffusivity, specularity, smoothness, animation_time, attenuation_factor[N_LIGHTS];

            // Flags for alternate shading methods
            uniform bool GOURAUD, COLOR_NORMALS, USE_TEXTURE;
            uniform vec4 lightPosition[N_LIGHTS], lightColor[N_LIGHTS], shapeColor;
            
            // Specifier "varying" means a variable's final value will be passed from the vertex shader
            // on to the next phase (fragment shader), then interpolated per-fragment, weighted by the 
            // pixel fragment's proximity to each of the 3 vertices (barycentric interpolation).       
            varying vec3 N, E;                     
            varying vec2 f_tex_coord;             
            varying vec4 VERTEX_COLOR;            
            varying vec3 L[N_LIGHTS];
            varying float dist[N_LIGHTS];

            vec3 phong_model_lights( vec3 N ) {
                vec3 result = vec3(0.0);
                for(int i = 0; i < N_LIGHTS; i++) {
                    vec3 H = normalize( L[i] + E );
                    
                    float attenuation_multiplier = 1.0;// / (1.0 + attenuation_factor[i] * (dist[i] * dist[i]));
                    float diffuse  =      max( dot(N, L[i]), 0.0 );
                    float specular = pow( max( dot(N, H), 0.0 ), smoothness );

                    result += attenuation_multiplier * ( shapeColor.xyz * diffusivity * diffuse + lightColor[i].xyz * specularity * specular );
                }
                return result;
            }`;
    }

    // ********* VERTEX SHADER *********
    vertex_glsl_code() {
        return `
            attribute vec3 object_space_pos, normal;
            attribute vec2 tex_coord;

            uniform mat4 camera_transform, camera_model_transform, projection_camera_model_transform;
            uniform mat3 inverse_transpose_modelview;

            void main() {
                // The vertex's final resting place (in NDCS).
                gl_Position = projection_camera_model_transform * vec4(object_space_pos, 1.0);
                
                // The final normal vector in screen space.
                N = normalize( inverse_transpose_modelview * normal );
                
                // Directly use original texture coords and interpolate between.
                f_tex_coord = tex_coord;

                // Bypass all lighting code if we're lighting up vertices some other way.
                if( COLOR_NORMALS ) {
                    // In "normals" mode, rgb color = xyz quantity. Flash if it's negative.
                    VERTEX_COLOR = vec4( N[0] > 0.0 ? N[0] : sin( animation_time * 3.0   ) * -N[0],             
                                         N[1] > 0.0 ? N[1] : sin( animation_time * 15.0  ) * -N[1],
                                         N[2] > 0.0 ? N[2] : sin( animation_time * 45.0  ) * -N[2] , 1.0 );
                    return;
                }
                
                // The rest of this shader calculates some quantities that the Fragment shader will need:
                vec3 camera_space_pos = ( camera_model_transform * vec4(object_space_pos, 1.0) ).xyz;
                E = normalize( -camera_space_pos );

                // Light positions use homogeneous coords.  Use w = 0 for a directional light source -- a vector instead of a point.
                for( int i = 0; i < N_LIGHTS; i++ ) {
                    L[i] = normalize( ( camera_transform * lightPosition[i] ).xyz - lightPosition[i].w * camera_space_pos );

                    // Is it a point light source?  Calculate the distance to it from the object.  Otherwise use some arbitrary distance.
                    dist[i]  = lightPosition[i].w > 0.0 ? distance((camera_transform * lightPosition[i]).xyz, camera_space_pos)
                                                        : distance( attenuation_factor[i] * -lightPosition[i].xyz, object_space_pos.xyz );
                }

                // Gouraud shading mode?  If so, finalize the whole color calculation here in the vertex shader,
                // one per vertex, before we even break it down to pixels in the fragment shader.   As opposed 
                // to Smooth "Phong" Shading, where we *do* wait to calculate final color until the next shader.
                if( GOURAUD ) {
                    VERTEX_COLOR      = vec4( shapeColor.xyz * ambient, shapeColor.w);
                    VERTEX_COLOR.xyz += phong_model_lights( N );
                }
            }`;
    }

    // ********* FRAGMENT SHADER *********
    // A fragment is a pixel that's overlapped by the current triangle.
    // Fragments affect the final image or get discarded due to depth.
    fragment_glsl_code() {
        return `
            uniform sampler2D texture;

            void main() {
                // Do smooth "Phong" shading unless options like "Gouraud mode" are wanted instead.
                // Otherwise, we already have final colors to smear (interpolate) across vertices.
                if( GOURAUD || COLOR_NORMALS ) {
                    gl_FragColor = VERTEX_COLOR;
                    return;
                }                                 
                // If we get this far, calculate Smooth "Phong" Shading as opposed to Gouraud Shading.
                // Phong shading is not to be confused with the Phong Reflection Model.

                // Sample the texture image in the correct place.
                vec4 tex_color = texture2D( texture, f_tex_coord );                    

                // Compute an initial (ambient) color:
                if( USE_TEXTURE )
                    gl_FragColor = vec4( ( tex_color.xyz + shapeColor.xyz ) * ambient, shapeColor.w * tex_color.w ); 
                else
                    gl_FragColor = vec4( shapeColor.xyz * ambient, shapeColor.w );
                
                // Compute the final color with contributions from lights.
                gl_FragColor.xyz += phong_model_lights( N );
            }`;
    }

    // Define how to synchronize our JavaScript's variables to the GPU's:
    update_GPU(g_state, model_transform, material, gpu=this.g_addrs, gl=this.gl) {
        // First, send the matrices to the GPU, additionally cache-ing some products of them we know we'll need:
        this.update_matrices(g_state, model_transform, gpu, gl);
        gl.uniform1f(gpu.animation_time_loc, g_state.animation_time / 1000);
		
		/*
		//Add transparency
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
        gl.enable(gl.BLEND);
        gl.disable(gl.DEPTH_TEST);
		*/

        if (g_state.gouraud === undefined) {
            g_state.gouraud = g_state.color_normals = false;
        }

        // Keep the flags seen by the shader program up-to-date and make sure they are declared.
        gl.uniform1i(gpu.GOURAUD_loc, g_state.gouraud);
        gl.uniform1i(gpu.COLOR_NORMALS_loc, g_state.color_normals);

        // Send the desired shape-wide material qualities to the graphics card, where they will
        // tweak the Phong lighting formula.
        gl.uniform4fv(gpu.shapeColor_loc,  material.color);
        gl.uniform1f( gpu.ambient_loc,     material.ambient);
        gl.uniform1f( gpu.diffusivity_loc, material.diffusivity);
        gl.uniform1f( gpu.specularity_loc, material.specularity);
        gl.uniform1f( gpu.smoothness_loc,  material.smoothness);

        // NOTE: To signal not to draw a texture, omit the texture parameter from Materials.
        if (material.texture) {
            gpu.shader_attributes["tex_coord"].enabled = true;
            gl.uniform1f(gpu.USE_TEXTURE_loc, 1);
            gl.bindTexture(gl.TEXTURE_2D, material.texture.id);
        }
        else {
            gl.uniform1f(gpu.USE_TEXTURE_loc, 0);
            gpu.shader_attributes["tex_coord"].enabled = false;
        }

        if (!g_state.lights.length)
            return;
        var lightPositions_flattened = [],
            lightColors_flattened = [],
            lightAttenuations_flattened = [];
        for (var i = 0; i < 4 * g_state.lights.length; i++) {
            lightPositions_flattened.push(g_state.lights[Math.floor(i / 4)].position[i % 4]);
            lightColors_flattened.push(g_state.lights[Math.floor(i / 4)].color[i % 4]);
            lightAttenuations_flattened[Math.floor(i / 4)] = g_state.lights[Math.floor(i / 4)].attenuation;
        }
        gl.uniform4fv(gpu.lightPosition_loc, lightPositions_flattened);
        gl.uniform4fv(gpu.lightColor_loc, lightColors_flattened);
        gl.uniform1fv(gpu.attenuation_factor_loc, lightAttenuations_flattened);
    }

    // Helper function for sending matrices to GPU.
    update_matrices(g_state, model_transform, gpu, gl) {
        // (PCM will mean Projection * Camera * Model)
        let [P,C,M] = [g_state.projection_transform, g_state.camera_transform, model_transform],
            CM = C.times(M),
            PCM = P.times(CM),
            inv_CM = Mat4.inverse(CM).sub_block([0, 0], [3, 3]);

        // Send the current matrices to the shader.  Go ahead and pre-compute
        // the products we'll need of the of the three special matrices and just
        // cache and send those.  They will be the same throughout this draw
        // call, and thus across each instance of the vertex shader.
        // Transpose them since the GPU expects matrices as column-major arrays.                                  
        gl.uniformMatrix4fv(gpu.camera_transform_loc, false, Mat.flatten_2D_to_1D(C.transposed()));
        gl.uniformMatrix4fv(gpu.camera_model_transform_loc, false, Mat.flatten_2D_to_1D(CM.transposed()));
        gl.uniformMatrix4fv(gpu.projection_camera_model_transform_loc, false, Mat.flatten_2D_to_1D(PCM.transposed()));
        gl.uniformMatrix3fv(gpu.inverse_transpose_modelview_loc, false, Mat.flatten_2D_to_1D(inv_CM));
    }
}
