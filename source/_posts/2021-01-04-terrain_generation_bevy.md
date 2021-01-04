---
layout: post
title: "Terrain Generation in Bevy Engine - Part 1: Rendering"
date: 2021-01-04 01:00:00 +0200
comments: true
categories: [rust, bevy, gamedev]
---

# Introduction

The use of rust language [in major companies](https://www.zdnet.com/article/rust-programming-language-were-using-it-for-bigger-projects-say-developers/) is increasing  and with it also the game dev community is growing.

[New libraries are published almost weekly](https://arewegameyet.rs/) and, with enough patieance, it's already possible to build a high-quality game. The open-world RPG [Veloren](https://veloren.net/) is a notable example.

Pushed by some recently published, impressive games such as [TLOU2](https://www.youtube.com/watch?v=qPNiIeKMHyg) and [Cyberpunk 2077](https://www.youtube.com/watch?v=UnA7tepsc7s) I decided to invest again part of my free time in gamedev experiments and to try out the new [Bevy](https://bevyengine.org/) game engine.

Bevy is an ECS-based, 2D and 3D game engine currently under development, but it provides already many features for a simple game. 

**In this post, we will build a simple terrain visualization**, while also exploring some of Bevy's capabilities

## Generating a mesh from a heightmap

Usually, terrain is described by a heightmap, usually a squared, grayscale image where each pixel encodes the height of the terrain at **(x, z)** coordinates 

(*note: we will work in a Y-up world*). 


<p align="center">
  <img alt="img-name" src="https://upload.wikimedia.org/wikipedia/commons/4/4d/Parinacota--S019W070.png" width="300">
  <br>
    <em>Example Heightmap from Wikipedia</em>
</p>


**Our application will load the image and turn the heightmap into a mesh. **

The simplest approach for doing this would be to partition a plane with a simple pattern of triangles, where the **y** component of each vector is sampled from the heightmap:

<p align="center">
<img alt="img-name" src="/images/bevy_terrain0.png" width="200">
<br>
    <em>Simple triangle partition</em>
</p>


For instance, by applying this approach on the simple heightmap on the left, we obtain the mesh on the right:

<div class="row" style="display: flex">
  <div class="column" style="width: 50%; align-self: center">
    <p align="center">
        <img alt="img-name" src="/images/bevy_terrain2.png" width="200" style="border: #ccc 1px solid">
        <br>
        <em>Input Heightmap</em>
    </p>
  </div>
  <div class="column"  style="width: 50%">
    <p align="center">
        <img alt="img-name" src="/images/bevy_terrain1.png" width="300">
        <br>
        <em>Output Mesh</em>
    </p>
  </div>
</div>  <div class="column">

The above method is perfectly fine in most cases, but if we are going to generate and show multiple meshes (e.g. in an open-world game) the count of triangles is going to increase soon. 

## Reducing the number of triangles - RTIN


One simple option for reducing the number of triangles consists in **approximating parts of the heightmap where the slope is low.**
This way, planar parts in our mesh will be composed by a minor number of triangles:


<p align="center">
<img alt="img-name" src="/images/bevy_terrain3.png" width="300">
<br>
    <em>An approximated version of the previous mesh</em>
</p>


[RTIN](https://www.cs.ubc.ca/~will/papers/rtin.pdf) (Right-Triangulated Irregular Networks) is one possible algorithm for achieving this. It was nicely described in [this Observable article](https://observablehq.com/@mourner/martin-real-time-rtin-terrain-mesh) by Vladimir Agafonkin from Mapbox. I have ported his javascript code [into rust](https://github.com/clynamen/bevy_terrain/blob/main/src/terrain_rtin.rs).

In a nutshell, the algorithm divides the space into two right-triangles recursively (like in a [BSP](https://en.wikipedia.org/wiki/Binary_space_partitioning)). The obtained hierarchy allows choosing which triangle should be used for the mesh and which triangle should be ignored.
I advise reading the article if you want to know how it works.

The function 

```rust
pub fn rtin_build_terrain_from_heightmap(
    heightmap: &HeightMapU16, error_threshold: f32) -> TerrainMeshData
```

accepts the heightmap image data and the maximum allowed error as input. It follows the same process described in the article: 

 1. computes the approximation error for each triangle 
 2. traverses the triangle hierarchy, collecting all the triangles that satisfy the error_threshold
 3. computes and returns the vertices and indices of each selected triangle:

```rust
pub struct TerrainMeshData {
   pub vertices: Vec::<Vec3>,
   pub indices: Vec::<u32>
}
```

Given an image of side **N** (where N is a power of 2) the terrain will extend from (0, 0) to (N, N) with a height ranging from 0.0 to 1.0

## Build the Bevy mesh 

Let's go back to Bevy now. How can we visualize the triangles
that we obtained? 

**It is very easy to create a new mesh**: we choose the primitive topology (*i.e. do you want to draw points, triangles, or lines?*):

```rust
let mut mesh = if enable_wireframe {
    Mesh::new(PrimitiveTopology::LineList)
} else {
    Mesh::new(PrimitiveTopology::TriangleList)
};
```

We then create the vectors that will contain the mesh vertex attributes and indices:

```rust
let mut vertices : Vec::<[f32; 3]> = Vec::new();
let mut indices : Vec::<u32> = Vec::new();
let mut colors  : Vec::<[f32; 3]> = Vec::new();
```

and we fill them starting from the ``TerrainMeshData`` obtained above.

**Vertices positition and color:**

```rust
for vertex in &terrain_mesh_data.vertices {
    vertices.push([vertex.x, vertex.y, vertex.z]);

    let color = grad.get(vertex.y);
    let raw_float : Srgb::<f32> = 
        Srgb::<f32>::from_linear(color.into());
    colors.push(
        [raw_float.red, raw_float.green, raw_float.blue]);
}
```

The vertices will have a color proportional to the terrain height. The [palette](https://docs.rs/palette/0.5.0/palette/) library is used for generating the color gradient.

**Indices:**

It is useful to show the terrain wireframe for debugging. So we will use different indices depending on whether we want to draw triangles or lines.

```rust
if enable_wireframe {
    for i in 0..triangle_number {
        // three line for each triangle, 
        // we specify start index and end index of each line
        // (we are ignoring the duplicated lines ofc)
        for j in &[0, 1, 1, 2, 2, 0] {
            indices.push(terrain_mesh_data.indices[i*3+j]);
        }
    }
} else {
    for i in 0..triangle_number {
        // three vertex for each triangle
        for j in 0..3 {
            indices.push(terrain_mesh_data.indices[i*3+j]);
        }
    }
}
```

We can now add these vectors to the mesh:

```rust
mesh.set_attribute(
    Mesh::ATTRIBUTE_POSITION,
    VertexAttributeValues::Float3(vertices));
mesh.set_attribute(
    TerrainMaterial::ATTRIBUTE_COLOR, 
    VertexAttributeValues::Float3(colors)
);
mesh.set_indices(Some(Indices::U32(indices)));
```

the ``set_attribute`` function accepts an arbitrary string as the first argument. This string will later be referenced in the shader.

Rust type system and Bevy perform all the type conversion for us, so we avoid mangling with byte arrays and pointer casts.

**Our mesh is now ready**.

## Mesh material

Bevy [standard material](https://docs.rs/bevy_pbr/0.4.0/bevy_pbr/prelude/struct.StandardMaterial.html) allows to use a texture, but it does not support vertex colors. In order to draw the terrain with color proportional to the height, our shader has to use the ``TerrainMaterial::ATTRIBUTE_COLOR`` mesh attribute.

In order to do this, we will use the simple render pipeline and shaders from the [mesh_custom_attribute.rs](https://github.com/bevyengine/bevy/blob/master/examples/shader/mesh_custom_attribute.rs) example.

The ``add_terrain_pipeline`` function, called during setup, creates and returns a new pipeline:

```rust
#[derive(RenderResources, Default, TypeUuid)]
#[uuid = "0320b9b8-b3a3-4baa-8bfa-c94008177b17"]
pub struct TerrainMaterial {
}

impl TerrainMaterial {
    pub const ATTRIBUTE_COLOR: &'static str = "Vertex_Color";
}


pub fn add_terrain_pipeline(
    mut pipelines: ResMut<Assets<PipelineDescriptor>>,
    mut shaders: ResMut<Assets<Shader>>,
    mut render_graph: ResMut<RenderGraph>
) -> Handle<PipelineDescriptor> {

    // Create a new shader pipeline
    let pipeline_handle = pipelines.add(PipelineDescriptor::default_config(ShaderStages {
        vertex: shaders.add(Shader::from_glsl(ShaderStage::Vertex, VERTEX_SHADER)),
        fragment: Some(shaders.add(Shader::from_glsl(ShaderStage::Fragment, FRAGMENT_SHADER))),
    }));

    // Add an AssetRenderResourcesNode to our Render Graph. This will bind TerrainMaterial resources to our shader
    render_graph.add_system_node(
        "terrain_material_node",
        AssetRenderResourcesNode::<TerrainMaterial>::new(true),
    );

    // Add a Render Graph edge connecting our new "terrain_material_node" node to the main pass node. This ensures "terrain_material_node" runs before the main pass
    render_graph
        .add_node_edge(
            "terrain_material_node",
            base::node::MAIN_PASS,
        )
        .unwrap();

    pipeline_handle
}
```

## Make the mesh available for use

*Note: concepts such as Assets, Handle and Resources are described in the [Bevy Introduction](https://bevyengine.org/news/introducing-bevy/)*

We will not add the mesh directly to an Entity. Instead, the mesh will be owned by the ``Assets`` asset manager. 
Once we move the mesh to the manager, we obtain a ``Handle`` in exchange:

```rust
let terrain_shaded_mesh_handle : Handle<Mesh> = meshes.add(terrain_shaded_mesh);
```

This ``Handle`` is now a clonable reference to the mesh. It is quite useful because, for instance, we can add it to a Bevy ``Resource``: 

```rust
#[derive(Default)]
pub struct TerrainMeshResource {
    pub shaded: Handle<Mesh>,
    pub wireframe: Handle<Mesh>,
}
```

So that we can reference later the mesh in any system. For instance, the following system allows us to switch between the shaded and wireframe mesh: 


```rust
pub fn switch_mesh_system(
    keyboard_input: Res<Input<KeyCode>>,
    // query for selecting the entity with the terrain mesh
    mut terrain_query: Query<(Entity, &mut Handle<Mesh>, &Terrain)>,
    // resource for accessing the shaded and wireframe mesh handles
    terrain_mesh_res: Res<TerrainMeshResource>,
    commands: &mut Commands,
) {
    
    let new_mesh_handle = 
        if keyboard_input.just_pressed(KeyCode::N) {
            Some(terrain_mesh_res.shaded.clone())
        } else if keyboard_input.just_pressed(KeyCode::M) {
            Some(terrain_mesh_res.wireframe.clone())
        } else {
            Option::None
        };

    if(new_mesh_handle.is_some()) {
        let handle = new_mesh_handle.unwrap();
        for (entity, mut mesh, _terrain) in terrain_query.iter_mut() {
            commands.remove_one::<Handle<Mesh>>(entity);
            commands.set_current_entity(entity);
            commands.with(handle.clone());
        }
    }
}
```

## Add the mesh to the scene

Finally, let's spawn an entity in the scene with the terrain mesh:

```rust
commands
    .spawn(MeshBundle {
        mesh: terrain_mesh_res.shaded.clone(),
        render_pipelines: RenderPipelines::from_pipelines(
            vec![RenderPipeline::new(pipeline_handle,)]),
        transform: Transform::from_translation(
            Vec3::new(0.0, 0.0, 0.0)),
        ..Default::default()
    })
    .with(Terrain{})
```

The terrain mesh will now be visible in the scene:


<div class="row" style="display: flex">
  <div class="column" style="width: 50%; align-self: center">
    <p align="center">
        <img alt="img-name" src="/images/bevy_terrain4.png" width="300">
    </p>
  </div>
  <div class="column"  style="width: 50%">
    <p align="center">
        <img alt="img-name" src="/images/bevy_terrain5.png" width="300">
    </p>
  </div>
</div>  


Note that, beyond spawning the ``MeshBundle``, we added a ``Terrain`` component. This empty struct actually does nothing at all! However, by adding it to our entity, it works as a tag for referencing this entity in a query. Check the previous definition of ``switch_mesh_system``

```rust
pub fn switch_mesh_system(
    //...
    mut terrain_query: Query<(Entity, &mut Handle<Mesh>, &Terrain)>,
    // ...
) {
    // ...
}
```

The ``terrain_query`` will only look for entities that contain **both a mesh and a terrain component**.


# Conclusion

After a few days spent playing with this really promising framework I can totally say that using Bevy it's a nice experience: 

 - There are enough examples for learning how to use its features
 - The ECS system seems very powerful and composable. So far I was always under the impression that I could read and write every part of the application in a clean way, without incurring in borrow checker issues. I don't know if this will hold true in larger applications, but I am optimistic about it
 - Many features are missing right now (e.g. there are just a couple of UI widgets) but the development is pretty active.

In the next post, we will add support for generating random terrain. Until then, you can check the [current source code here](https://github.com/clynamen/bevy_terrain/tree/0.0.1)

