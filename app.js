import { createClient } from '@supabase/supabase-js';
import express from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import cors from 'cors';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';


dotenv.config();
const supabaseUrl = 'https://rujclvrxksqnijyqcwgz.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
const app = express();
app.use(cors({
    origin: "*",
    methods: ['POST', 'PUT', 'GET', 'DELETE', 'OPTIONS', 'HEAD'],
    credentials: true,
    allowedHeaders: '*'
}));
app.set("trust proxy", 1);
const port = 3000;

app.use(express.json());

const upload = multer({ 
    storage: multer.memoryStorage(), // Usando memoryStorage para almacenar archivos en la memoria temporalmente
    limits: { fileSize: 100 * 1024 * 1024},
    json: true
});
async function authenticateToken (req, res, next) {
    //Bearer token
    console.log("sasa");
    console.log(req.headers);
    const authHeader = req.headers['authorization'];
    console.log(authHeader);
    const token = authHeader && authHeader.split(' ')[1];
    console.log(token);
    // let token_limpio = token.slice(1, -1);
    // console.log(token_limpio);
    if (!token) return res.sendStatus(401);
    console.log("ojojo");
    await jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err,id) => {
        if (err) return res.status(403); //token expiration
        req.id = id;
        console.log("fin");
        next();
    })
}
async function insertToSupabase(table, values) {
    const error = await supabase
        .from(table)
        .insert(values);
    return error;
}
async function updateToSupabase(table, values, campo, id) {
    const error = await supabase
        .from(table)
        .update(values)
        .eq(campo, id);
    return error;
}
async function uploadFileToSupabase(bucketName, fileBuffer, fileName, contentType) {
    try {
        // Upload file
        const { data, error } = await supabase.storage
            .from(bucketName)
            .upload(fileName, fileBuffer, {
                cacheControl: '3600',
                upsert: false,
                contentType: contentType,
            });
        if (error) {
            console.error('Error uploading file:', error);
        }
        // Return the public URL of the uploaded file
        const publicURL = await supabase.storage.from(bucketName).createSignedUrl(fileName, 31536000000);
        return publicURL.data.signedUrl;
    } catch (error) {
        console.error('Error uploading file to Supabase:', error);
        return null;
    }
}
app.get("/", async (req,res) =>{
    res.send("hola vercel");
})
app.post("/turnos", authenticateToken, async (req, res) =>{
    const body = req.body;
    const fecha = body.fecha;
    const hora = body.hora;
    const motivo = body.motivo;
    const descripcion = body.descripcion;
    const insert_error = await insertToSupabase("turnos", {
        fecha: fecha,
        hora: hora,
        id_usuario: req.id.id,
        motivo: motivo,
        descripcion: descripcion,
        aceptado: false
    });
    if (insert_error.error) {
        console.log("log", insert_error);
        return res.status(500).send('Error inserting data');
    }
    res.send("turno creado exitosamente");
} )
app.get("/turnos", authenticateToken, async (req,res) =>{
    const { data, error } = await supabase
        .from('turnos')
        .select('*');
    if (error) {
        console.error('Error fetching data:', error.message);
        return res.status(500).send('Error fetching data');
    }
    console.log(data);
    console.log((data.filter(data => data.id === req.id.id)));
    res.send(data.filter(data => data.id_usuario === req.id.id));
})
app.get("/fecha_turnos", async (req,res) => {
    const { data, error } = await supabase
        .from('turnos')
        .select("fecha, hora");
    if (error) {
        console.error('Error fetching data:', error.message);
        return res.status(500).send('Error fetching data');
    }
    res.json({"data": data});
        
})
app.get("/todos_turnos", async (req,res) => {
    const { data, error } = await supabase
        .from('turnos')
        .select();
    if (error) {
        console.error('Error fetching data:', error.message);
        return res.status(500).send('Error fetching data');
    }
    res.json({"data": data});
        
})

app.post("/login",  async (req,res) =>{

    const body = req.body;
    const name = body.name;
    const password = body.password;

    const { data, error } = await supabase
        .from('usuarios')
        .select()
        .eq('usuario', body.nombre);
    console.log(data);
    if(!data[0]){
        res.status(500).send('User not found');
    }
    let compared = await bcrypt.compareSync(password, data[0].password);
    if (compared){
        const id = data[0].id;
        const accessToken = jwt.sign({id: id}, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '72h'});
        res.json({accessToken: accessToken});
    }
    else{
        res.send("Password incorrect");
    }
    if (error) { 
        res.status(500).send('Error inserting data');
    }
})
app.post('/signup', async (req,res)=> {
    const body = req.body;
    const password = await bcrypt.hash(body.password, 10);
    
    const { data, error } = await supabase
        .from("usuarios")
        .insert({
            usuario: body.mail,
            password: password,
            admin: false
        })
        .select();
    if (error){
        res.status(500).send('Error inserting data');
    }
    if(!data[0]){
        res.status(500).send('Error selecting data');
    }
    const id = data[0].id;
    const error_insert_usuarios = await insertToSupabase("perfiles",{
        id_usuario: id,
        nombre: body.nombre,
        apellido: body.apellido,
        edad: body.edad
    })
    // const error_update_perfiles = await updateToSupabase("perfiles",{
    //     nombre: body.nombre,
    //     apellido: body.apellido,
    //     edad: body.edad,
    // }, "id_usuario", data[0].id);
    if (error_insert_usuarios.error) {
       console.log(error_insert_usuarios);
       return res.status(500).send('Error posting data: '+ error_insert_usuarios.error);
    }
    
    // if (error_update_perfiles.error) {
    //     console.log(error_update_perfiles);
    //     return res.status(500).send('Error posting data: '+ error_update_perfiles.error);
    // }
    // else if (error_update_perfiles.error) {
    //     console.log(error_update_perfiles);
    //     return res.status(500).send('Error posting data: '+ error_update_perfiles.error);
    // }
    else {
        const accessToken = jwt.sign({id: id}, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1h'});
        return res.json({message:`User created successfully.`, accessToken: accessToken });
    }
})
    
app.post("/perfil", upload.single('foto'), authenticateToken, async (req,res) => {
    const body = req.body;
    const foto = req.foto.buffer;
    if (!foto) {
        return res.status(400).json({error:'No file uploaded.'});
    }
    const bucketName = 'estudios_bucket';
    const uniqueFileName = `${uuidv4()}-${file.originalname}`;
    const publicURL = await uploadFileToSupabase(bucketName, file.buffer, uniqueFileName, file.mimetype);
    if (!publicURL) {
        return res.status(500).send('Error uploading file to Supabase.');
    }
    let dict = {};
    console.log(typeof(body));
    Object.entries(body).forEach(campo => {
        if (campo[0] == 'foto'){
            dict[campo[0]] = publicURL;
        }
        else{
            dict[campo[0]] = campo[1];
        }
    });
    console.log(dict);
    const error_update_perfiles = await updateToSupabase("perfiles", dict, "id_usuario", req.id.id);
    if (error_update_perfiles.error) {
        console.log(error_update_perfiles);
        return res.status(500).send('Error posting data: '+ error_update_perfiles.error);
    }
    res.send("Perfil actualizado correctamente.");
})
app.get("/perfil", authenticateToken, async (req,res) => {
    const { data, error } = await supabase
        .from('perfiles')
        .select()
        .eq("id_usuario", req.id.id);
    if (error) {
        console.error('Error fetching data:', error.message);
        return res.status(500).send('Error fetching data');
    }
    console.log(data);

    res.send(data[0]);
})
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}/`);
});