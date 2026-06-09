import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Activity, Clock, CheckCircle2, XCircle, LogOut, Code2, RefreshCw, Trash2, Mail, Bot, Plus, X, Hourglass } from 'lucide-react';
import Logo from '../components/Logo';

export default function Dashboard() {
  const { token, logout, isAuthenticated } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Custom Task Modal State
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [customTaskId, setCustomTaskId] = useState('');
  const [taskType, setTaskType] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskDeps, setTaskDeps] = useState('');
  const [executeAt, setExecuteAt] = useState('');
  const [emailNotify, setEmailNotify] = useState(false);

  // Leetcode Modal State
  const [showLeetcodeModal, setShowLeetcodeModal] = useState(false);

  // AI Modal State
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiTaskId, setAiTaskId] = useState(null);
  
  // Feedback
  const [feedback, setFeedback] = useState({ message: '', type: '' });

  const showMessage = (msg, type) => {
    setFeedback({ message: msg, type });
    setTimeout(() => setFeedback({ message: '', type: '' }), 5000);
  };

  // Task Details Modal State
  const [selectedTask, setSelectedTask] = useState(null);

  const fetchTasks = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/tasks', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setTasks(data);
      }
    } catch (err) {
      console.error('Failed to fetch tasks', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) fetchTasks();
  }, [isAuthenticated, token]);

  // Polling mechanism for AI Task
  useEffect(() => {
    let interval;
    if (aiTaskId) {
      interval = setInterval(() => {
        fetchTasks();
      }, 2000); // Poll every 2 seconds
    }
    return () => clearInterval(interval);
  }, [aiTaskId]);

  const submitAiSummary = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setAiTaskId(null); // Reset previous task
    try {
      const res = await fetch('http://localhost:8080/api/tasks', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          taskType: 'AI_SUMMARY',
          payload: { topic: aiTopic },
          executeAt: null
        })
      });
      if (!res.ok) throw new Error(await res.text());
      const newTask = await res.json();
      
      setAiTaskId(newTask.id); // Save ID to start polling
      showMessage('AI Task dispatched to Background Workers!', 'success');
      fetchTasks();
    } catch (err) {
      showMessage(`Error: ${err.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Find the AI task in the current tasks list to show its status/result
  const activeAiTask = aiTaskId ? tasks.find(t => t.id === aiTaskId) : null;

  const triggerLeetcode = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('http://localhost:8080/api/tasks/leetcode', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(await res.text());
      showMessage('LeetCode Watcher triggered successfully!', 'success');
      fetchTasks();
    } catch (err) {
      showMessage(`Error: ${err.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const createQuickTask = async (type, payload) => {
    setActionLoading(true);
    try {
      const res = await fetch('http://localhost:8080/api/tasks', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          taskType: type,
          payload: payload,
          executeAt: null 
        })
      });
      if (!res.ok) throw new Error(await res.text());
      showMessage(`Task ${type} created successfully!`, 'success');
      fetchTasks();
    } catch (err) {
      showMessage(`Failed to create task: ${err.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const submitCustomTask = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const parsedPayload = {};
      if (taskDesc) parsedPayload.description = taskDesc;
      if (emailNotify) {
        parsedPayload.emailNotification = true;
        parsedPayload.targetEmail = JSON.parse(atob(token.split('.')[1])).sub;
      }

      let parsedDeps = null;
      if (taskDeps) {
        parsedDeps = taskDeps.split(',').map(s => s.trim()).filter(s => s.length > 0);
      }

      let execInstant = null;
      if (executeAt) {
        execInstant = new Date(executeAt).toISOString();
      }

      const finalType = taskType ? taskType.toUpperCase().replace(/\s+/g, '_') : 'CUSTOM_JOB';

      const res = await fetch('http://localhost:8080/api/tasks', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          taskId: customTaskId ? customTaskId : null,
          taskType: finalType,
          dependsOnTaskIds: parsedDeps,
          payload: parsedPayload,
          executeAt: execInstant
        })
      });
      if (!res.ok) throw new Error(await res.text());

      showMessage('Custom task scheduled successfully!', 'success');
      fetchTasks();
      setShowTaskForm(false);
      setCustomTaskId('');
      setTaskType('');
      setTaskDesc('');
      setTaskDeps('');
      setExecuteAt('');
      setEmailNotify(false);
    } catch (err) {
      showMessage(`Error: ${err.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const clearTasks = async () => {
    setActionLoading(true);
    try {
      await fetch('http://localhost:8080/api/tasks', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      showMessage('All tasks cleared!', 'success');
      fetchTasks();
    } catch (err) {
      showMessage(`Error: ${err.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const deleteSingleTask = async (taskId) => {
    setActionLoading(true);
    try {
      const res = await fetch(`http://localhost:8080/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(await res.text());
      showMessage('Task deleted successfully!', 'success');
      setSelectedTask(null);
      fetchTasks();
    } catch (err) {
      showMessage(`Error: ${err.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (!isAuthenticated) return null;

  const pendingCount = tasks.filter(t => t.status === 'PENDING').length;
  const waitingCount = tasks.filter(t => t.status === 'WAITING').length;
  const completedCount = tasks.filter(t => t.status === 'COMPLETED').length;
  const failedCount = tasks.filter(t => t.status === 'FAILED').length;

  return (
    <div className="dashboard-wrapper">
      <header className="topbar" style={{ padding: '1.5rem 2rem' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Logo size={36} />
            <h1 style={{ fontSize: '1.75rem', fontWeight: '800' }}>CronaFlow</h1>
          </div>
          <span style={{ color: 'var(--text-secondary)', fontSize: '1.125rem', fontWeight: '500', marginLeft: '0.5rem' }}>
            Background Task Scheduler
          </span>
        </div>
        <button onClick={logout} className="btn btn-outline" style={{ border: 'none', fontSize: '1.25rem', padding: '0.75rem 1.5rem' }}>
          <LogOut size={24} /> Logout
        </button>
      </header>

      <main className="dashboard-content">
        {feedback.message && (
          <div style={{
            padding: '1.5rem',
            marginBottom: '2rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: feedback.type === 'error' ? 'var(--danger-color)' : 'var(--success-color)',
            color: 'white',
            fontWeight: '600',
            fontSize: '1.25rem'
          }}>
            {feedback.message}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem' }}>
          <div>
            <h2 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '0.5rem' }}>Dashboard</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.25rem' }}>Monitor your background tasks and triggers.</p>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <button onClick={fetchTasks} disabled={isLoading} className="btn btn-outline" style={{ fontSize: '1.125rem', padding: '0.75rem 1.5rem' }}>
              <RefreshCw size={24} className={isLoading ? 'spinning' : ''} /> Refresh
            </button>
            <button onClick={clearTasks} disabled={actionLoading} className="btn btn-outline" style={{ fontSize: '1.125rem', padding: '0.75rem 1.5rem', color: 'var(--danger-color)', borderColor: 'var(--danger-color)' }}>
              <Trash2 size={24} /> Clear Data
            </button>
          </div>
        </div>

        <div className="metrics-grid" style={{ gap: '1.5rem' }}>
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              <Clock size={28} /> <span style={{ fontWeight: '600', fontSize: '1.5rem' }}>Pending</span>
            </div>
            <div className="metric-value" style={{ color: '#d97706', fontSize: '3rem' }}>{pendingCount}</div>
          </div>
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              <Hourglass size={28} /> <span style={{ fontWeight: '600', fontSize: '1.5rem' }}>Waiting</span>
            </div>
            <div className="metric-value" style={{ color: '#4f46e5', fontSize: '3rem' }}>{waitingCount}</div>
          </div>
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              <CheckCircle2 size={28} /> <span style={{ fontWeight: '600', fontSize: '1.5rem' }}>Completed</span>
            </div>
            <div className="metric-value" style={{ color: '#059669', fontSize: '3rem' }}>{completedCount}</div>
          </div>
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              <XCircle size={28} /> <span style={{ fontWeight: '600', fontSize: '1.5rem' }}>Failed</span>
            </div>
            <div className="metric-value" style={{ color: '#dc2626', fontSize: '3rem' }}>{failedCount}</div>
          </div>
        </div>

        {/* Action Center - Horizontal bar */}
        <div className="card" style={{ marginBottom: '2.5rem' }}>
          <h3 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '1.5rem' }}>Action Center</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
            <button onClick={() => setShowLeetcodeModal(true)} disabled={actionLoading} className="btn btn-outline" style={{ fontSize: '1.125rem', padding: '0.75rem 1.5rem' }}>
              <Code2 size={24} /> Check LeetCode
            </button>
            
            <button onClick={() => setShowAiModal(true)} className="btn btn-outline" style={{ fontSize: '1.125rem', padding: '0.75rem 1.5rem', borderColor: 'var(--primary-color)', color: 'var(--primary-color)' }}>
              <Bot size={24} /> Ask Agnes AI
            </button>

            <button onClick={() => setShowTaskForm(true)} className="btn btn-primary" style={{ fontSize: '1.125rem', padding: '0.75rem 1.5rem', marginLeft: 'auto' }}>
              <Plus size={24} /> Custom Task
            </button>
          </div>

          {/* AI Modal */}
          {showAiModal && (
            <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '1.5rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.75rem' }}><Bot size={28}/> Ask Agnes AI</h4>
                <button onClick={() => setShowAiModal(false)} className="btn btn-outline" style={{ padding: '0.5rem' }}><X size={24}/></button>
              </div>

              <form onSubmit={submitAiSummary} style={{ display: 'flex', gap: '1.5rem' }}>
                <input 
                  type="text" 
                  className="input-field" 
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  placeholder="Enter a topic to summarize..."
                  required
                  style={{ fontSize: '1.25rem', padding: '1rem' }}
                />
                <button type="submit" disabled={actionLoading} className="btn btn-primary" style={{ fontSize: '1.25rem', padding: '1rem 2rem' }}>
                  Generate
                </button>
              </form>

              {activeAiTask && (
                <div style={{ marginTop: '1.5rem', padding: '1.5rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <span style={{ fontWeight: '700', fontSize: '1.25rem' }}>Task Status:</span>
                    <span className={`badge badge-${activeAiTask.status.toLowerCase()}`} style={{ fontSize: '1.125rem' }}>{activeAiTask.status}</span>
                  </div>
                  
                  {activeAiTask.status === 'PENDING' || activeAiTask.status === 'WAITING' ? (
                     <p style={{ color: 'var(--text-secondary)', fontSize: '1.25rem' }}>Worker is processing your request in the background... Please wait.</p>
                  ) : activeAiTask.status === 'COMPLETED' ? (
                     <div>
                       <strong style={{ color: 'var(--success-color)', fontSize: '1.25rem' }}>Agnes AI Response:</strong>
                       <p style={{ whiteSpace: 'pre-wrap', marginTop: '1rem', lineHeight: '1.8', fontSize: '1.125rem', color: 'var(--text-primary)' }}>{activeAiTask.result || "No result generated. Did you provide an API Key?"}</p>
                       <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                         <button 
                           onClick={() => {
                             const userEmail = JSON.parse(atob(token.split('.')[1])).sub;
                             createQuickTask('SEND_EMAIL', { 
                               email: userEmail, 
                               subject: `Agnes AI Summary: ${aiTopic}`, 
                               body: activeAiTask.result || 'No response generated.'
                             });
                           }} 
                           disabled={actionLoading} 
                           className="btn btn-outline" 
                           style={{ fontSize: '1.125rem', padding: '0.75rem 1.5rem' }}
                         >
                           <Mail size={20} style={{ marginRight: '0.5rem' }} /> Email me this info
                         </button>
                       </div>
                     </div>
                  ) : (
                     <p style={{ color: 'var(--danger-color)', fontSize: '1.25rem' }}>Task failed to process. Check your Spring Boot logs.</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Task Queue Table */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '2rem', borderBottom: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '1.75rem', fontWeight: '700' }}>Task Queue</h3>
          </div>
          <div className="table-wrapper" style={{ border: 'none', borderRadius: '0 0 var(--radius-lg) var(--radius-lg)' }}>
            <table>
              <thead>
                <tr>
                  <th style={{ fontSize: '1.125rem' }}>Task ID</th>
                  <th style={{ fontSize: '1.125rem' }}>Type</th>
                  <th style={{ fontSize: '1.125rem' }}>Status</th>
                  <th style={{ fontSize: '1.125rem' }}>Created At</th>
                  <th style={{ fontSize: '1.125rem' }}>Executes At</th>
                </tr>
              </thead>
              <tbody>
                {tasks.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)', fontSize: '1.25rem' }}>
                      No tasks in the queue.
                    </td>
                  </tr>
                ) : (
                  tasks.map(task => (
                    <tr key={task.id} onClick={() => setSelectedTask(task)} style={{ cursor: 'pointer', transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(128, 128, 128, 0.1)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                      <td style={{ fontFamily: 'monospace', color: 'var(--text-secondary)', fontSize: '1.125rem' }}>{task.id.slice(0, 16)}...</td>
                      <td style={{ fontWeight: '600', fontSize: '1.125rem' }}>{task.taskType}</td>
                      <td>
                        <span className={`badge badge-${task.status.toLowerCase()}`} style={{ fontSize: '1rem', padding: '0.25rem 0.75rem' }}>
                          {task.status}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '1.125rem' }}>{new Date(task.createdAt).toLocaleString()}</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '1.125rem' }}>{task.executeAt ? new Date(task.executeAt).toLocaleString() : 'Immediate'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* New Task Modal Overlay */}
      {showTaskForm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(6px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
          <div style={{
            backgroundColor: 'var(--card-bg)', borderRadius: '16px', width: '100%', maxWidth: '600px',
            border: '1px solid var(--border-color)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            display: 'flex', flexDirection: 'column'
          }}>
            {/* Header */}
            <div style={{ padding: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>New Task</h3>
              <button onClick={() => setShowTaskForm(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.5rem' }}>
                <X size={28} />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={submitCustomTask} style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', color: 'var(--text-primary)', fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.75rem' }}>Custom ID (Optional)</label>
                  <input 
                    type="text" 
                    value={customTaskId}
                    onChange={(e) => setCustomTaskId(e.target.value)}
                    placeholder="e.g. REPORT_GEN_1"
                    style={{
                      width: '100%', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)',
                      borderRadius: '8px', padding: '1rem', color: 'var(--text-primary)', fontSize: '1.125rem',
                      outline: 'none'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: 'var(--text-primary)', fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.75rem' }}>Task Type</label>
                  <input 
                    type="text" 
                    value={taskType}
                    onChange={(e) => setTaskType(e.target.value)}
                    placeholder="What needs doing?"
                    required
                    style={{
                      width: '100%', backgroundColor: 'var(--bg-color)', border: '1px solid var(--primary-color)',
                      borderRadius: '8px', padding: '1rem', color: 'var(--text-primary)', fontSize: '1.125rem',
                      outline: 'none', boxShadow: '0 0 0 1px rgba(139, 92, 246, 0.3)'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', color: 'var(--text-primary)', fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.75rem' }}>Description</label>
                <textarea 
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  placeholder="Optional details..."
                  rows="3"
                  style={{
                    width: '100%', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)',
                    borderRadius: '8px', padding: '1rem', color: 'var(--text-primary)', fontSize: '1.125rem',
                    outline: 'none', resize: 'vertical'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', color: 'var(--text-primary)', fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.75rem' }}>Dependencies (Task IDs)</label>
                <input 
                  type="text" 
                  value={taskDeps}
                  onChange={(e) => setTaskDeps(e.target.value)}
                  placeholder="e.g. 6a245d9, 1d12345 (comma separated)"
                  style={{
                    width: '100%', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)',
                    borderRadius: '8px', padding: '1rem', color: 'var(--text-primary)', fontSize: '1.125rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', color: 'var(--text-primary)', fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.75rem' }}>Due date</label>
                <input 
                  type="datetime-local" 
                  value={executeAt}
                  onChange={(e) => setExecuteAt(e.target.value)}
                  style={{
                    width: '100%', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)',
                    borderRadius: '8px', padding: '1rem', color: 'var(--text-primary)', fontSize: '1.125rem',
                    outline: 'none', colorScheme: 'dark'
                  }}
                />
              </div>

              <div style={{
                backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '8px',
                padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem'
              }}>
                <input 
                  type="checkbox" 
                  id="emailNotify"
                  checked={emailNotify}
                  onChange={(e) => setEmailNotify(e.target.checked)}
                  style={{
                    width: '22px', height: '22px', accentColor: 'var(--primary-color)', cursor: 'pointer'
                  }}
                />
                <label htmlFor="emailNotify" style={{ color: 'var(--text-primary)', fontSize: '1.125rem', fontWeight: '500', cursor: 'pointer', userSelect: 'none' }}>
                  Email me at the due time
                </label>
              </div>

              {/* Footer Actions */}
              <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem' }}>
                <button 
                  type="button" 
                  onClick={() => setShowTaskForm(false)}
                  style={{
                    flex: 1, backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)',
                    borderRadius: '8px', padding: '1rem', fontSize: '1.125rem', fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={actionLoading}
                  style={{
                    flex: 1, backgroundColor: 'var(--primary-color)', border: 'none', color: 'white',
                    borderRadius: '8px', padding: '1rem', fontSize: '1.125rem', fontWeight: '700',
                    cursor: 'pointer', transition: 'background-color 0.2s',
                    opacity: actionLoading ? 0.7 : 1
                  }}
                >
                  {actionLoading ? 'Scheduling...' : 'Add Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LeetCode Explanation Modal Overlay */}
      {showLeetcodeModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 60,
          backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(6px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
          <div style={{
            backgroundColor: 'var(--card-bg)', borderRadius: '16px', width: '100%', maxWidth: '540px',
            border: '1px solid var(--border-color)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            display: 'flex', flexDirection: 'column'
          }}>
            <div style={{ padding: '2rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Code2 size={28} color="var(--primary-color)" /> LeetCode Watcher
              </h3>
              <button onClick={() => setShowLeetcodeModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.5rem' }}>
                <X size={28} />
              </button>
            </div>

            <div style={{ padding: '2rem', color: 'var(--text-secondary)', fontSize: '1.25rem', lineHeight: '1.6' }}>
              <p style={{ marginBottom: '1.25rem' }}>
                Activating this watcher will dispatch a background worker to connect to LeetCode's GraphQL API.
              </p>
              <p style={{ marginBottom: '1.25rem' }}>
                It will securely scrape the dates for the next upcoming Weekly or Biweekly contest.
              </p>
              <p>
                Once found, the worker will automatically schedule an email reminder to be sent to your inbox exactly <strong style={{ color: 'var(--text-primary)' }}>24 hours before the contest begins!</strong>
              </p>
            </div>

            <div style={{ padding: '2rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '1.5rem' }}>
              <button onClick={() => setShowLeetcodeModal(false)} style={{
                flex: 1, backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-primary)',
                borderRadius: '8px', padding: '1rem', fontSize: '1.125rem', fontWeight: '600', cursor: 'pointer'
              }}>
                Cancel
              </button>
              <button onClick={() => {
                setShowLeetcodeModal(false);
                triggerLeetcode();
              }} style={{
                flex: 1, backgroundColor: 'var(--primary-color)', border: 'none', color: 'white',
                borderRadius: '8px', padding: '1rem', fontSize: '1.125rem', fontWeight: '700', cursor: 'pointer'
              }}>
                Activate Watcher
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Details Modal */}
      {selectedTask && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 60,
          backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(6px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'var(--card-bg)', borderRadius: '16px', width: '100%', maxWidth: '650px',
            border: '1px solid var(--border-color)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            display: 'flex', flexDirection: 'column', maxHeight: '90vh'
          }}>
            <div style={{ padding: '2rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                Task Details
              </h3>
              <button onClick={() => setSelectedTask(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.5rem' }}>
                <X size={28} />
              </button>
            </div>

            <div style={{ padding: '2rem', color: 'var(--text-primary)', fontSize: '1.125rem', overflowY: 'auto' }}>
              <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Task ID:</span>
                <span style={{ fontFamily: 'monospace' }}>{selectedTask.id}</span>
              </div>
              <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Type:</span>
                <span style={{ fontWeight: '600' }}>{selectedTask.taskType}</span>
              </div>
              <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Status:</span>
                <span className={`badge badge-${selectedTask.status.toLowerCase()}`}>{selectedTask.status}</span>
              </div>
              <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Created At:</span>
                <span>{new Date(selectedTask.createdAt).toLocaleString()}</span>
              </div>
              
              <div style={{ marginTop: '2rem' }}>
                <strong style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>Payload:</strong>
                <pre style={{ backgroundColor: 'var(--bg-color)', padding: '1rem', borderRadius: '8px', overflowX: 'auto', fontSize: '0.875rem', border: '1px solid var(--border-color)' }}>
                  {JSON.stringify(selectedTask.payload, null, 2)}
                </pre>
              </div>

              {selectedTask.result && (
                <div style={{ marginTop: '1.5rem' }}>
                  <strong style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>Result:</strong>
                  <pre style={{ backgroundColor: 'var(--bg-color)', padding: '1rem', borderRadius: '8px', overflowX: 'auto', fontSize: '0.875rem', border: '1px solid var(--border-color)', whiteSpace: 'pre-wrap' }}>
                    {selectedTask.result}
                  </pre>
                </div>
              )}
              
              {selectedTask.lastErrorMsg && (
                <div style={{ marginTop: '1.5rem' }}>
                  <strong style={{ color: 'var(--danger-color)', display: 'block', marginBottom: '0.5rem' }}>Last Error:</strong>
                  <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: '8px', color: 'var(--danger-color)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    {selectedTask.lastErrorMsg}
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: '2rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '1.5rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setSelectedTask(null)} className="btn btn-outline" style={{ fontSize: '1.125rem', padding: '0.75rem 1.5rem' }}>
                Close
              </button>
              <button 
                onClick={() => deleteSingleTask(selectedTask.id)} 
                className="btn btn-outline" 
                style={{ fontSize: '1.125rem', padding: '0.75rem 1.5rem', color: 'var(--danger-color)', borderColor: 'var(--danger-color)' }}
              >
                <Trash2 size={20} /> Delete Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
