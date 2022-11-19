var loader = new THREE.FileLoader();
// loader.load("/src/components/renderer/shaders/pbr.vert", function (data) { shaders.pbr.vert = data; });
// loader.load("/src/components/renderer/shaders/pbr.frag", function (data) { shaders.pbr.frag = data; });
// loader.load("/src/components/renderer/shaders/quad_post.vert", function (data) { shaders.quad.vert = data; });
// loader.load("/src/components/renderer/shaders/quad_post.frag", function (data) { shaders.quad.frag = data; });

// export const shaders = {
//     pbr: {
//         vert: "",
//         frag: ""
//     },
//     quad: {
//         vert: "",
//         frag: ""
//     }
// }

const shaders = {
    pbr: {
        vert: "",
        frag: ""
    },
    quad: {
        vert: "",
        frag: ""
    }
}

var loader = function (url) {
    var data;
    jQuery.ajax({
        url: url,
        async: false,
        success: function (result) {
            data = result;
        }
    });
    return data;
}

shaders.pbr.vert = loader("src/components/renderer/shaders/pbr.vert");
shaders.pbr.frag = loader("src/components/renderer/shaders/pbr.frag");
shaders.quad.vert = loader("src/components/renderer/shaders/quad_post.vert");
shaders.quad.frag = loader("src/components/renderer/shaders/quad_post.frag");
export { shaders };

