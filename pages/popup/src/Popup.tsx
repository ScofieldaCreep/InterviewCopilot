import React, { useEffect, useState, useRef } from 'react';
import './Popup.css';
import macIcon from '../public/mac.svg';
import winIcon from '../public/win.svg';

interface User {
  uid: string; // ← 新增 uid
  name: string;
  email: string;
  photo?: string;
  hasValidSubscription: boolean;
  creationTime: number;
}

interface Option {
  value: string;
  label: string;
}

/** ================== 基础UI组件 ================== **/
const Button: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary';
  }
> = ({ variant = 'primary', children, className = '', ...props }) => {
  const baseClass = 'button';
  const variantClass = variant === 'primary' ? 'button-primary' : 'button-secondary';
  return (
    <button className={`${baseClass} ${variantClass} ${className}`} {...props}>
      {children}
    </button>
  );
};

const CustomSelect: React.FC<{
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  id?: string;
}> = ({ options, value, onChange, id }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const selectedOption = options.find(opt => opt.value === value);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsSelecting(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
    setIsSelecting(true);
  };

  const handleOptionClick = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setIsSelecting(false);
  };

  return (
    <div className="custom-select" ref={dropdownRef}>
      <div
        className={`select-selected ${isSelecting ? 'selecting' : ''}`}
        onClick={handleSelectClick}
        dangerouslySetInnerHTML={{ __html: selectedOption?.label || '' }}></div>
      {isOpen && (
        <div className="select-options">
          {options.map(option => (
            <div
              key={option.value}
              className={`select-option ${option.value === value ? 'selected' : ''}`}
              onClick={() => handleOptionClick(option.value)}
              dangerouslySetInnerHTML={{ __html: option.label }}></div>
          ))}
        </div>
      )}
    </div>
  );
};

const ConfigItem: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="config-item">
    <label>{label}</label>
    {children}
  </div>
);

const UserInfo: React.FC<{ user: User; onLogout: () => void }> = ({ user, onLogout }) => (
  <div className="user-card">
    <img src={user.photo || 'default-avatar.png'} alt={user.name} className="user-avatar" />
    <div className="user-details">
      <div className="user-name">
        {user.name}
        <span className="user-status">{user.hasValidSubscription ? 'Pro' : 'Trial'}</span>
      </div>
      <p className="user-email">{user.email}</p>
    </div>
    {user.hasValidSubscription ? (
      <Button
        variant="secondary"
        onClick={() => window.open('https://billing.stripe.com/p/login/3cs8AD2ipdpe8TedQQ', '_blank')}
        className="manage-button">
        Manage
      </Button>
    ) : (
      <Button variant="secondary" onClick={onLogout} className="logout-button">
        Logout
      </Button>
    )}
  </div>
);

// const ShortcutHint: React.FC = () => (
//   <div className="shortcut-hint">
//     <div className="shortcut-item">
//       <span>Open Settings:</span>
//       <span className="shortcut-key">Alt + Shift + Y</span>
//     </div>
//     <div className="shortcut-item">
//       <span>Quick Solution:</span>
//       <span className="shortcut-key">Alt + Q</span>
//     </div>
//   </div>
// );

const NavigationHint: React.FC<{
  notificationsEnabled: boolean;
  onNotificationToggle: () => Promise<void>;
}> = ({ notificationsEnabled, onNotificationToggle }) => (
  <div className="navigation-hint">
    <div className="nav-title">⚡️ Pro Tips</div>
    <div className="shortcut-container">
      <div className="shortcut-item">
        <div className="shortcut-info">
          <span className="shortcut-icon">⌥</span>
          <span className="shortcut-plus">+</span>
          <span className="shortcut-icon">Q</span>
        </div>
        <div className="shortcut-description">
          <span className="shortcut-label">Stealth Shortcut</span>
          <span className="shortcut-detail">
            Silently peek solutions, in one hidden click.
            <br />
            <span className="shortcut-platform">
              <span className="platform-icon">
                <img src={macIcon} alt="Mac" width="14" height="14" />
              </span>
              Option + Q
            </span>
            <br />
            <span className="shortcut-platform">
              <span className="platform-icon">
                <img src={winIcon} alt="Windows" width="14" height="14" />
              </span>
              Alt + Q
            </span>
          </span>
        </div>
      </div>
    </div>

    <div className="shortcut-tip">
      <div className="tip-content">
        <span className="tip-icon">💡</span>
        <span className="shortcut-label">
          Solutions will pop up as an unactive window next to current Chrome page without disturbing your active tab.
        </span>
      </div>

      <div className="notification-settings">
        <div className="settings-header">
          <span className="settings-icon">🔔</span>
          <span className="settings-title">Action Notifications</span>
        </div>
        <div className="settings-content">
          <label className="toggle-switch">
            <input type="checkbox" checked={notificationsEnabled} onChange={onNotificationToggle} />
            <span className="toggle-slider"></span>
          </label>
          <div className="settings-descriptions">
            <span className="settings-description">Enable AlgoAce notifications</span>
            <span className="settings-description muted">Mute this in interviews with screen recording</span>
          </div>
        </div>
      </div>

      <div className="contact-info">
        <span className="contact-icon">💌</span>
        <span className="contact-text">Welcome Suggestions: chizhang2048@gmail.com</span>
      </div>
    </div>
  </div>
);

const Header: React.FC<{ isLoggedIn?: boolean }> = ({ isLoggedIn }) => (
  <header className={`header ${isLoggedIn ? 'header-minimal' : ''}`}>
    {isLoggedIn ? (
      // 登录后显示简洁版本
      <div className="logo-container-minimal">
        <span className="logo-icon-small">⚡️</span>
        <h1 className="title-small">Interview Copilot</h1>
      </div>
    ) : (
      // 登录前显示完整版本
      <>
        <div className="logo-container">
          <span className="logo-icon">⚡️</span>
          <h1 className="title">Interview Copilot</h1>
        </div>
        <p className="subtitle">Your AI Interview Success Partner</p>
        <div className="header-features">
          <div className="feature-badge">
            <span className="badge-icon">🎯</span>
            <span className="badge-text">100% Undetectable</span>
          </div>
          <div className="feature-badge">
            <span className="badge-icon">🚀</span>
            <span className="badge-text">Instant Solutions</span>
          </div>
          <div className="feature-badge">
            <span className="badge-icon">🔒</span>
            <span className="badge-text">Privacy First</span>
          </div>
        </div>
      </>
    )}
  </header>
);

const LoginSection: React.FC<{ onLogin: () => void }> = ({ onLogin }) => (
  <div className="login-section">
    <p style={{ marginBottom: '10px' }}>Login with Google to enjoy a 30-minute unlimited AI solution trial!</p>
    <Button variant="primary" onClick={onLogin}>
      Login with Google
    </Button>
  </div>
);

const ModelSelector: React.FC<{
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}> = ({ value, onChange, disabled }) => {
  const models = [
    {
      value: 'gpt-4o-mini',
      label: 'Fast',
      description: 'GPT-4o',
    },
    {
      value: 'o1-mini',
      label: 'Balanced',
      description: 'o1 series',
      pro: true,
    },
    {
      value: 'o3-mini',
      label: 'Accurate',
      description: 'o3 series',
      pro: true,
    },
  ];

  return (
    <div className="model-selector">
      {models.map(model => (
        <button
          key={model.value}
          className={`model-button ${value === model.value ? 'active' : ''} ${model.pro && disabled ? 'pro' : ''}`}
          onClick={() => onChange(model.value)}
          disabled={disabled && model.pro}>
          <div className="model-button-content">
            <span className="model-label">{model.label}</span>
            <span className="model-description">{model.description}</span>
            {model.pro && disabled && <span className="pro-badge">Pro</span>}
          </div>
        </button>
      ))}
    </div>
  );
};

/** ================== 合并后的统一用户面板组件 ================== **/
const UserDashboard: React.FC<{
  user: User;
  onLogout: () => void;
  model: string;
  setModel: React.Dispatch<React.SetStateAction<string>>;
  language: string;
  setLanguage: React.Dispatch<React.SetStateAction<string>>;
  programmingLanguage: string;
  setProgrammingLanguage: React.Dispatch<React.SetStateAction<string>>;
  context: string;
  setContext: React.Dispatch<React.SetStateAction<string>>;
  remainingTime: number;
  onGetSolution: () => void;
  onSubscribe: () => void;
  notificationsEnabled: boolean;
  onNotificationToggle: () => Promise<void>;
}> = ({
  user,
  onLogout,
  model,
  setModel,
  language,
  setLanguage,
  programmingLanguage,
  setProgrammingLanguage,
  context,
  setContext,
  remainingTime,
  onGetSolution,
  onSubscribe,
  notificationsEnabled,
  onNotificationToggle,
}) => {
  const inTrial = !user.hasValidSubscription && remainingTime > 0;
  const trialTimeLeft = inTrial
    ? `${Math.floor(remainingTime / 60000)}m ${Math.floor((remainingTime % 60000) / 1000)}s`
    : '';

  return (
    <>
      <UserInfo user={user} onLogout={onLogout} />

      <div className="settings-grid">
        <ConfigItem label="Model">
          <ModelSelector value={model} onChange={setModel} disabled={!user.hasValidSubscription && !inTrial} />
          {!user.hasValidSubscription && !inTrial && (
            <div className="model-upgrade-hint">
              <span className="hint-icon">✨</span>
              <span className="hint-text">3x faster & more accurate solutions with Pro models</span>
            </div>
          )}
        </ConfigItem>

        <div className="settings-row">
          <ConfigItem label="Language">
            <CustomSelect
              id="language"
              value={language}
              onChange={setLanguage}
              options={[
                { value: 'en', label: '🇺🇸 English' },
                { value: 'zh', label: '🇨🇳 中文' },
                { value: 'ja', label: '🇯🇵 日本語' },
                { value: 'es', label: '🇪🇸 Español' },
                { value: 'hi', label: '🇮🇳 हिन्दी' },
              ]}
            />
          </ConfigItem>

          <ConfigItem label="Code">
            <CustomSelect
              id="programmingLanguage"
              value={programmingLanguage}
              onChange={setProgrammingLanguage}
              options={[
                {
                  value: 'python',
                  label:
                    '<img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/python/python-original.svg" width="16" height="16" style="vertical-align: middle; margin-right: 4px;" /> Python',
                },
                {
                  value: 'java',
                  label:
                    '<img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/java/java-original.svg" width="16" height="16" style="vertical-align: middle; margin-right: 4px;" /> Java',
                },
                {
                  value: 'cpp',
                  label:
                    '<img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/cplusplus/cplusplus-original.svg" width="16" height="16" style="vertical-align: middle; margin-right: 4px;" /> C++',
                },
                {
                  value: 'js',
                  label:
                    '<img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/javascript/javascript-original.svg" width="16" height="16" style="vertical-align: middle; margin-right: 4px;" /> JavaScript',
                },
                {
                  value: 'sql',
                  label:
                    '<img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/mysql/mysql-original.svg" width="16" height="16" style="vertical-align: middle; margin-right: 4px;" /> SQL',
                },
                {
                  value: 'go',
                  label:
                    '<img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/go/go-original.svg" width="16" height="16" style="vertical-align: middle; margin-right: 4px;" /> Go',
                },
                {
                  value: 'rust',
                  label:
                    '<img src="https://raw.githubusercontent.com/rust-lang/rust-artwork/master/logo/rust-logo-64x64.png" width="16" height="16" style="vertical-align: middle; margin-right: 4px;" /> Rust',
                },
                {
                  value: 'c',
                  label:
                    '<img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/c/c-original.svg" width="16" height="16" style="vertical-align: middle; margin-right: 4px;" /> C',
                },
                {
                  value: 'kotlin',
                  label:
                    '<img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/kotlin/kotlin-original.svg" width="16" height="16" style="vertical-align: middle; margin-right: 4px;" /> Kotlin',
                },
                {
                  value: 'swift',
                  label:
                    '<img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/swift/swift-original.svg" width="16" height="16" style="vertical-align: middle; margin-right: 4px;" /> Swift',
                },
                {
                  value: 'typescript',
                  label:
                    '<img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/typescript/typescript-original.svg" width="16" height="16" style="vertical-align: middle; margin-right: 4px;" /> TypeScript',
                },
              ]}
            />
          </ConfigItem>
        </div>

        <ConfigItem label="Custom Instructions (Optional)">
          <textarea
            id="context"
            rows={2}
            placeholder="Add custom requirements or preferences..."
            value={context}
            onChange={e => setContext(e.target.value)}
          />
        </ConfigItem>
      </div>

      <style>
        {`
          select option[value="o1-mini"],
          select option[value="o1"] {
            color: ${!user.hasValidSubscription && !inTrial ? '#666' : 'inherit'};
          }
        `}
      </style>

      {user.hasValidSubscription ? (
        // Premium user
        <div className="action-section">
          <Button variant="primary" onClick={onGetSolution} className="solution-button">
            <span className="button-content">
              <span>Get Solution</span>
            </span>
          </Button>
        </div>
      ) : (
        // Free or trial user
        <div className="trial-section">
          {trialTimeLeft ? (
            <div className="trial-status">
              <div className="timer-display">
                <div className="timer-label">Trial Expires In:</div>
                <div className="timer-value">{trialTimeLeft}</div>
              </div>
              <div className="trial-message">
                <span className="highlight">Premium Features Unlocked</span>
                <span className="sub-text">Using advanced AI models</span>
              </div>
            </div>
          ) : (
            <div className="upgrade-prompt">
              <div className="prompt-badge">Limited Time Offer</div>
              <h3>Ready to Secure Your Offer?</h3>
              <div className="benefits">
                <div className="benefit-item">
                  <span className="check">✓</span>
                  <span>Use the best coding model: OpenAI O1</span>
                </div>
                <div className="benefit-item">
                  <span className="check">✓</span>
                  <span>Get unlimited solutions</span>
                </div>
                <div className="benefit-item">
                  <span className="check">✓</span>
                  <span>And run out of the algorithm nightmare</span>
                </div>
              </div>
            </div>
          )}

          <div className="action-buttons">
            <Button variant="secondary" onClick={onGetSolution} className="solution-button">
              <span className="button-content">
                <span>Get Solution</span>
              </span>
            </Button>
            <Button variant="primary" onClick={onSubscribe} className="upgrade-button">
              <span className="button-content">
                <span>Upgrade Now</span>
                <span className="discount-badge">Save 20%</span>
              </span>
            </Button>
          </div>
        </div>
      )}
      <NavigationHint notificationsEnabled={notificationsEnabled} onNotificationToggle={onNotificationToggle} />
    </>
  );
};

/** ================== 后台交互逻辑函数 ================== **/

// ① 需要用到刷新请求时，可以自己选择：
//   - 在 handleGetSolutionAction 前先刷新
//   - 或者在 Popup 加载时刷新(已在后面useEffect里做)

async function handleGetSolutionAction(
  model: string,
  language: string,
  context: string,
  programmingLanguage: string, // 新增参数
) {
  // 确保存储所有配置
  await new Promise<void>(resolve => {
    chrome.storage.sync.set(
      {
        model: model || 'gpt-4o-mini', // 增加默认值
        language: language || 'en',
        context: context || '',
        programmingLanguage: programmingLanguage || 'python',
      },
      resolve,
    );
  });

  await new Promise<void>(resolve => {
    chrome.storage.sync.set({ model, language, context }, resolve);
  });
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const tab = tabs[0];
    if (tab && tab.id) {
      chrome.runtime
        .sendMessage({ action: 'getAnswer', tabId: tab.id })
        .then(response => {
          if (response?.error) {
            console.error('获取答案错误:', response.error);
          } else {
            console.log('答案获取成功');
          }
        })
        .catch(error => {
          console.error('消息发送失败:', error);
        });
    } else {
      console.error('无效的标签页');
    }
  });
}

function handleLoginAction() {
  chrome.runtime.sendMessage({ action: 'login' }, response => {
    if (response && response.success) {
      console.log('登录窗口已打开，请在弹出的窗口中完成登录。');
    } else {
      console.error('登录失败', response?.error);
    }
  });
}

function handleLogoutAction(setUser: React.Dispatch<React.SetStateAction<User | null>>) {
  chrome.storage.sync.remove('user', () => {
    if (chrome.runtime.lastError) {
      console.error('登出失败:', chrome.runtime.lastError);
    } else {
      setUser(null);
      console.log('用户已成功注销');
    }
  });
}

function handleSubscribeAction() {
  chrome.runtime.sendMessage({ action: 'subscribe' }, response => {
    console.log('订阅响应:', response);
    if (response?.error) {
      console.error('订阅错误:', response.error);
    } else {
      console.log('订阅成功');
    }
  });
}

/** ================== 主组件 ================== **/
const Popup: React.FC = () => {
  const [model, setModel] = useState('gpt-4o-mini');
  const [language, setLanguage] = useState('en');
  const [context, setContext] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const [programmingLanguage, setProgrammingLanguage] = useState('python');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  // 初始化数据 - 增加默认值处理
  useEffect(() => {
    chrome.storage.sync.get(
      ['model', 'language', 'context', 'user', 'programmingLanguage', 'notificationsEnabled'],
      data => {
        setModel(data.model || 'gpt-4o-mini');
        setLanguage(data.language || 'en');
        setContext(data.context || '');
        setProgrammingLanguage(data.programmingLanguage || 'python');
        setNotificationsEnabled(data.notificationsEnabled || true);

        if (data.user) {
          setUser({
            uid: data.user.uid || '',
            name: data.user.name,
            email: data.user.email,
            photo: data.user.photoURL,
            hasValidSubscription: data.user.hasValidSubscription || data.user.email === 'scofieldacreep@gmail.com',
            creationTime: data.user.creationTime,
          });
        }
      },
    );
  }, []);

  // ② Popup 每次打开时，主动让后台刷新一次用户数据(按需拉取)
  useEffect(() => {
    chrome.runtime.sendMessage({ action: 'refreshUser' });
  }, []);

  // 监听storage变化
  useEffect(() => {
    function handleStorageChange(changes: { [key: string]: chrome.storage.StorageChange }) {
      if (changes.user && changes.user.newValue) {
        setUser({
          uid: changes.user.newValue.uid || '', // 新增
          name: changes.user.newValue.name,
          email: changes.user.newValue.email,
          photo: changes.user.newValue.photoURL,
          hasValidSubscription: changes.user.newValue.hasValidSubscription,
          creationTime: changes.user.newValue.creationTime,
        });
      }
    }
    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  // 同步其他配置
  useEffect(() => {
    chrome.storage.sync.set({ model, language, context, programmingLanguage }, () => {
      if (chrome.runtime.lastError) {
        console.error('Failed to save config:', chrome.runtime.lastError);
      } else {
        console.log('Config saved:', { model, language, context });
      }
    });
  }, [model, language, context, programmingLanguage]);

  // 使用 creationTime 来计算试用剩余时间
  useEffect(() => {
    if (user && !user.hasValidSubscription) {
      const TRIAL_DURATION = 30 * 60 * 1000;
      const updateRemaining = () => {
        const elapsed = Date.now() - user.creationTime;
        const remain = TRIAL_DURATION - elapsed;
        setRemainingTime(remain > 0 ? remain : 0);
      };
      updateRemaining();
      const intervalId = setInterval(updateRemaining, 1000);
      return () => clearInterval(intervalId);
    } else {
      setRemainingTime(0);
    }
  }, [user]);

  const handleGetSolution = () => handleGetSolutionAction(model, language, context, programmingLanguage);
  const handleLogin = () => handleLoginAction();
  const handleLogout = () => handleLogoutAction(setUser);
  const handleSubscribe = () => handleSubscribeAction();

  const handleNotificationToggle = async () => {
    const newState = !notificationsEnabled;

    if (newState) {
      // 请求通知权限
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setNotificationsEnabled(true);
        await chrome.storage.sync.set({ notificationsEnabled: true });
        // 发送测试通知
        chrome.notifications.create({
          type: 'basic',
          iconUrl: '/icon128.png',
          title: 'Interview Copilot 通知已启用',
          message: '您将收到重要的面试提示和解答通知。',
        });
      } else {
        // 如果用户拒绝了权限
        setNotificationsEnabled(false);
        await chrome.storage.sync.set({ notificationsEnabled: false });
      }
    } else {
      setNotificationsEnabled(false);
      await chrome.storage.sync.set({ notificationsEnabled: false });
    }
  };

  let content;
  if (!user) {
    content = <LoginSection onLogin={handleLogin} />;
  } else {
    content = (
      <UserDashboard
        user={user}
        onLogout={handleLogout}
        model={model}
        setModel={setModel}
        language={language}
        setLanguage={setLanguage}
        programmingLanguage={programmingLanguage}
        setProgrammingLanguage={setProgrammingLanguage}
        context={context}
        setContext={setContext}
        remainingTime={remainingTime}
        onGetSolution={handleGetSolution}
        onSubscribe={handleSubscribe}
        notificationsEnabled={notificationsEnabled}
        onNotificationToggle={handleNotificationToggle}
      />
    );
  }

  return (
    <div className="popup-container">
      <Header isLoggedIn={!!user} />
      {content}
    </div>
  );
};

export default Popup;
