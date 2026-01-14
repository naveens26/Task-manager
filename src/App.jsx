import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import axios from 'axios';
import { useEffect, useState } from 'react';
import Login from './components/Login';
import Register from './components/Register';
import TaskForm from './components/TaskForm';


const API_URL = import.meta.env.VITE_API_BASE_URL;

const App = () => {
  const [tasks, setTasks] = useState([]);
  const [user, setUser] = useState(null);
  const [showLogin, setShowLogin] = useState(true);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchTasks();
    }
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await axios.get(`${API_URL}/tasks`);
      setTasks(response.data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const handleLogin = (token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    fetchTasks();
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
    setTasks([]);
  };

  const handleCreateTask = async (taskData) => {
    try {
      await axios.post(`${API_URL}/tasks`, taskData);
      fetchTasks();
      setShowTaskForm(false);
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const handleUpdateTask = async (taskData) => {
    try {
      await axios.put(`${API_URL}/tasks/${editingTask.id}`, taskData);
      fetchTasks();
      setEditingTask(null);
      setShowTaskForm(false);
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await axios.delete(`${API_URL}/tasks/${taskId}`);
        fetchTasks();
      } catch (error) {
        console.error('Error deleting task:', error);
      }
    }
  };

  const onDragEnd = async (result) => {
    if (!result.destination) return;

    const sourceStatus = result.source.droppableId;
    const destinationStatus = result.destination.droppableId;

    if (sourceStatus === destinationStatus) return;

    const taskId = result.draggableId;
    const newStatus = destinationStatus;

    try {
      await axios.patch(`${API_URL}/tasks/${taskId}/status`, { status: newStatus });
      
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id.toString() === taskId 
            ? { ...task, status: newStatus }
            : task
        )
      );
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const pendingTasks = tasks.filter(task => task.status === 'pending');
  const completedTasks = tasks.filter(task => task.status === 'completed');

  if (!user) {
    return showLogin ? (
      <Login onLogin={handleLogin} onSwitch={() => setShowLogin(false)} />
    ) : (
      <Register onRegister={handleLogin} onSwitch={() => setShowLogin(true)} />
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <nav className="bg-white shadow-lg rounded-lg p-4 mb-8">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Task Manager</h1>
          <div className="flex items-center space-x-4">
            <span className="text-gray-600">Welcome, {user.username}!</span>
            <button
              onClick={() => {
                setShowTaskForm(true);
                setEditingTask(null);
              }}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
            >
              + New Task
            </button>
            <button
              onClick={handleLogout}
              className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Pending Tasks Column */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-yellow-600 mb-4 pb-2 border-b">
                Pending Tasks ({pendingTasks.length})
              </h2>
              <Droppable droppableId="pending">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-h-[200px] ${
                      snapshot.isDraggingOver ? 'bg-yellow-50' : ''
                    }`}
                  >
                    {pendingTasks.map((task, index) => (
                      <Draggable
                        key={task.id.toString()}
                        draggableId={task.id.toString()}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`bg-white p-4 rounded-lg shadow mb-3 cursor-pointer ${
                              snapshot.isDragging ? 'opacity-50' : ''
                            } border-l-4 border-yellow-500`}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <h3 className="font-semibold text-gray-800">{task.title}</h3>
                                {task.description && (
                                  <p className="text-gray-600 mt-2 text-sm">{task.description}</p>
                                )}
                                <span className="text-xs text-gray-500 mt-2 block">
                                  Created: {new Date(task.created_at).toLocaleDateString()}
                                </span>
                              </div>
                              <div className="flex space-x-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingTask(task);
                                    setShowTaskForm(true);
                                  }}
                                  className="text-blue-500 hover:text-blue-700"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteTask(task.id);
                                  }}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {pendingTasks.length === 0 && (
                      <div className="text-center text-gray-500 py-8">
                        No pending tasks. Drag tasks here or create new ones!
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            </div>

            {/* Completed Tasks Column */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-green-600 mb-4 pb-2 border-b">
                Completed Tasks ({completedTasks.length})
              </h2>
              <Droppable droppableId="completed">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-h-[200px] ${
                      snapshot.isDraggingOver ? 'bg-green-50' : ''
                    }`}
                  >
                    {completedTasks.map((task, index) => (
                      <Draggable
                        key={task.id.toString()}
                        draggableId={task.id.toString()}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`bg-white p-4 rounded-lg shadow mb-3 cursor-pointer ${
                              snapshot.isDragging ? 'opacity-50' : ''
                            } border-l-4 border-green-500`}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <h3 className="font-semibold text-gray-800 line-through">
                                  {task.title}
                                </h3>
                                {task.description && (
                                  <p className="text-gray-600 mt-2 text-sm line-through">
                                    {task.description}
                                  </p>
                                )}
                                <span className="text-xs text-gray-500 mt-2 block">
                                  Completed: {new Date(task.updated_at).toLocaleDateString()}
                                </span>
                              </div>
                              <div className="flex space-x-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingTask(task);
                                    setShowTaskForm(true);
                                  }}
                                  className="text-blue-500 hover:text-blue-700"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteTask(task.id);
                                  }}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {completedTasks.length === 0 && (
                      <div className="text-center text-gray-500 py-8">
                        No completed tasks. Drag tasks here when done!
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          </div>
        </DragDropContext>
      </div>

      {showTaskForm && (
        <TaskForm
          task={editingTask}
          onSubmit={editingTask ? handleUpdateTask : handleCreateTask}
          onCancel={() => {
            setShowTaskForm(false);
            setEditingTask(null);
          }}
        />
      )}
    </div>
  );
};

export default App;