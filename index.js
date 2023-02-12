// 建立資料庫連線
const mongo=require("mongodb");
//const uri="mongodb+srv://root:root123@happy.gvogvau.mongodb.net/?retryWrites=true&w=majority";
const uri="mongodb+srv://root:root123@mycluster.kx7m7.mongodb.net/?retryWrites=true&w=majority"
const client=new mongo.MongoClient(uri);
let db=null; // null 代表尚未連線成功
client.connect(async function(err){
  if(err){
    console.log("資料庫連線失敗", err);
    return;
  }
  db=client.db("member-system"); // 連線成功後取得資料庫物件供後續使用
  console.log("資料庫連線成功");
});

// 建立網站伺服器基礎設定
const express=require("express");
const app=express();
const session=require("express-session");

app.use(session({
  secret:"anything",
  resave:false,
  saveUninitialized:true
}));
app.set("view engine", "ejs");
app.set("views", "./views");
app.use(express.static("public"));
app.use(express.urlencoded({extended:true}));
// 建立需要的路由
app.get("/",function (req,res){
    res.render("index.ejs");

});
app.get("/member", async function(req, res){
    // 檢查使用者是否有透過登入程序，進入會員頁
    if(!req.session.member){
      res.redirect("/");
      return;
    }
    // 從 Session 取得登入會員的名稱
    const name=req.session.member.name;
    // 取得所有會員的名稱
    const collection=db.collection("member");
    let result=await collection.find({});
    let data=[];
    await result.forEach(function(member){
      data.push(member);
    });
    /*
      以下是 data 陣列的結構：
      [
        {name:"彭彭", email:"ply@ply.com", password:"ply"},
        {name:"丁滿", email:"tin@tin.com", password:"tin"},
        ...
      ]
    */
    res.render("member.ejs", {name:name, data:data});
  });
// 連線到 /error?msg= 錯誤訊息
app.get("/error",function (req,res){
    const msg=req.query.msg;
    res.render("error.ejs",{msg:msg});
});

// 登出會員功能的路由
app.get("/signout", function(req, res){
    req.session.member=null;
    res.redirect("/");});

// 登入會員功能的路由
app.post("/signin", async function(req, res){
    const email=req.body.email;
    const password=req.body.password;
    // 檢查資料庫中的資料
    const collection=db.collection("member");
    let result=await collection.findOne({
      $and:[
        {email:email},
        {password:password}
      ]
    });
    if(result===null){ // 沒有對應的會員資料，登入失敗
      res.redirect("/error?msg=登入失敗，郵件或密碼輸入錯誤");
      return;
    }
    // 登入成功，紀錄會員資訊在 Session 中
    req.session.member=result;
    res.redirect("/member");
  });

//建立註冊會員
app.post("/signup", async function(req, res){
    const name=req.body.name;
    const email=req.body.email;
    const password=req.body.password;
      // 檢查資料庫中的資料
  const collection=db.collection("member");
  let result=await collection.findOne({
    email:email
  });
  if(result!==null){ // Email 已經存在
    res.redirect("/error?msg=註冊失敗，信箱重複");
    return;
  }
    // 將新的會員資料放到資料庫
    result=await collection.insertOne({
        name:name, email:email, password:password
      });
      // 新增成功，導回首頁
      res.redirect("/");
    });
// 啟動伺服器 http://localhost:3000/
app.listen(process.env.PORT || 3000, function(){
  console.log("Server Started");
});