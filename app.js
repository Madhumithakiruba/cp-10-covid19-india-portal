const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const app = express();
const dbPath = path.join(__dirname, "todoApplication.db");
app.use(bodyParser.json());
let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server is running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

//Middle ware function for invalid scenarios
const middlewareFunc = (request, response, next) => {
  const { status, priority, category, due_date } = request.body;

  const errors = [];

  if (status && !["TO DO", "IN PROGRESS", "DONE"].includes(status)) {
    errors.push("Invalid Todo Status");
  }

  if (priority && !["HIGH", "MEDIUM", "LOW"].includes(priority)) {
    errors.push("Invalid Todo Priority");
  }

  if (category && !["WORK", "HOME", "LEARNING"].includes(category)) {
    errors.push("Invalid Todo Category");
  }

  if (due_date && isNaN(new Date(due_date))) {
    errors.push("Invalid Due Date");
  }

  if (errors.length > 0) {
    response.status(400).json({ errors });
  } else {
    next();
  }
};

app.get("/", async (request, response) => {
  const getAllQuery = `
        SELECT *
        FROM todo
    `;
  const fullTable = await db.all(getAllQuery);
  response.send(fullTable);
});

//API 1
//Returns a list of all todos whose status is 'TO DO'
app.get("/todos/", middlewareFunc, async (request, response) => {
  const { status, priority, category, search_q } = request.query;
  let getAllTodoStatusQuery = `
    SELECT 
        id as id,
        todo as todo,
        priority as priority,
        status as status,
        category as category,
        due_date as dueDate
    FROM
        todo
    WHERE
        1
  `;

  const params = [];
  if (status) {
    getAllTodoStatusQuery += " AND status = ?";
    params.push(status);
  }
  if (priority) {
    getAllTodoStatusQuery += " AND priority = ?";
    params.push(priority);
  }
  if (category) {
    getAllTodoStatusQuery += " AND category = ?";
    params.push(category);
  }
  if (search_q) {
    getAllTodoStatusQuery += " AND todo LIKE ?";
    params.push(`%${search_q}%`);
  }

  const result = await db.all(getAllTodoStatusQuery, params);
  response.send(result);
});

//API 2
//Returns a specific todo based on the todo ID
app.get("/todos/:todoId", middlewareFunc, async (request, response) => {
  const { todoId } = request.params;
  const query = `
    SELECT id,todo,priority,status,category,due_date as dueDate
    FROM todo
    WHERE id = '${todoId}'
    `;
  const result = await db.get(query);
  response.send(result);
});

//API 3
//Returns a list of all todos with a specific due date in the query parameter
app.get("/agenda/", middlewareFunc, async (request, response) => {
  const { date } = request.query;
  const query = `
    SELECT 
        id,
        todo,
        priority,
        status,
        category,
        due_date as dueDate
    FROM 
        todo
    WHERE 
        due_date = ?;
    `;
  const result = await db.all(query, [date]);
  response.send(result);
});

//API 4
//Create a todo in the todo table,
app.post("/todos/", middlewareFunc, async (request, response) => {
  const { id, todo, priority, status, category, due_date } = request.body;
  const query = `
    INSERT INTO todo (id,todo,priority,status,category,due_date)
    VALUES ('${id}','${todo}','${priority}','${status}','${category}','${due_date}');
    `;
  await db.run(query);
  response.send("Todo Successfully Added");
});

//API 5
//Updates the details of a specific todo based on the todo ID
app.put("/todos/:todoId/", middlewareFunc, async (request, response) => {
  const { todoId } = request.params;
  const {
    status = "",
    priority = "",
    category = "",
    due_date = "",
    todo = "",
  } = request.body;

  let updateQuery = `UPDATE todo SET`;
  let updateMessage = "Todo Details Updated";

  if (status) {
    updateQuery += ` status = '${status}',`;
    updateMessage = "Status Updated";
  }
  if (priority) {
    updateQuery += ` priority = '${priority}',`;
    updateMessage = "Priority Updated";
  }
  if (category) {
    updateQuery += ` category = '${category}',`;
    updateMessage = "Category Updated";
  }
  if (due_date) {
    updateQuery += ` due_date = '${due_date}',`;
    updateMessage = "Due Date Updated";
  }
  if (todo) {
    updateQuery += ` todo = '${todo}',`;
    updateMessage = "Todo Updated";
  }

  // Remove the trailing comma
  updateQuery = updateQuery.slice(0, -1);

  updateQuery += ` WHERE id = ${todoId};`;

  await db.run(updateQuery);
  response.send(updateMessage);
});

//API 6
//Deletes a todo from the todo table based on the todo ID
app.delete("/todos/:todoId", middlewareFunc, async (request, response) => {
  const { todoId } = request.params;
  const query = `
        DELETE FROM todo WHERE id = '${todoId}';
    `;
  await db.run(query);
  response.send("Todo Deleted");
});
module.exports = app;
