import {useState, useEffect} from 'react';
import {Button, Form, Space, /*Tabs,*/ Popconfirm} from 'antd';
import {v4 as uuid} from 'uuid';
import {FormItem, Content} from '@ra-lib/components';
import config from 'src/commons/config-hoc';
import {menuTargetOptions} from 'src/commons/options';
import styles from './style.less';

// const TabPane = Tabs.TabPane;

export default config()(function MenuEdit(props) {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [addTabKey/*, setAddTabKey*/] = useState('1');
    const {isAdd, selectedMenu, onSubmit, onValuesChange} = props;
    const textAreaHeight = document.documentElement.clientHeight - 280;

    const isAddTop = isAdd && (!selectedMenu || !Object.keys(selectedMenu).length);
    const isAddSub = isAdd && selectedMenu && Object.keys(selectedMenu).length;
    const title = isAddTop ? '添加顶级' : isAddSub ? '添加子级' : '修改菜单';
    const initialValues = isAddTop ? {target: menuTargetOptions.QIANKUN}
        : isAddSub ? {target: menuTargetOptions.MENU, parentId: selectedMenu.id, systemId: selectedMenu.systemId}
            : selectedMenu;

    const {run: deleteMenu} = props.ajax.useGet('/authority/del', null, {setLoading});
    const {run: saveMenu} = props.ajax.usePost('/authority/add', null, {setLoading});
    const {run: updateMenu} = props.ajax.usePost('/authority/update', null, {setLoading});

    useEffect(() => {
        form.resetFields();
        form.setFieldsValue(isAdd ? {status: true} : selectedMenu);
    }, [form, isAdd, selectedMenu]);

    async function handleSubmit(values) {
        if (loading) return;

        const params = {
            ...values,
            sort: values.order || 0,
            systemId: selectedMenu?.systemId,
            parentsId: isAdd ? selectedMenu?.id : selectedMenu?.parentId,
            type: '1', // 菜单
            code: uuid(),
            isFresh: isAdd ? false : values.status !== selectedMenu.status,
            status: values.status ? 1 : 0,
        };

        if (isAdd) {
            const res = await saveMenu(params);
            const {id} = res;
            onSubmit && onSubmit({...params, id, isAdd: true});

        } else {
            await updateMenu(params);
            onSubmit && onSubmit({...params, isUpdate: true});
        }
    }

    async function handleDelete() {
        const id = selectedMenu?.id;
        await deleteMenu({id});

        onSubmit && onSubmit({id, isDelete: true});
    }

    const layout = {
        labelCol: {flex: '100px'},
    };

    return (
        <Form
            className={styles.pane}
            name={`menu-form`}
            form={form}
            onFinish={handleSubmit}
            initialValues={initialValues}
            onValuesChange={onValuesChange}
        >
            <h3 className={styles.title}>{title}</h3>
            <Content loading={loading} className={styles.content}>
                {/*{isAddSub ? (*/}
                {/*    <Tabs*/}
                {/*        activeKey={addTabKey}*/}
                {/*        onChange={key => setAddTabKey(key)}*/}
                {/*    >*/}
                {/*        <TabPane key="1" tab="单个添加"/>*/}
                {/*        <TabPane key="2" tab="批量添加"/>*/}
                {/*    </Tabs>*/}
                {/*) : null}*/}
                <FormItem name="id" hidden/>
                {addTabKey === '1' ? (
                    <>
                        <FormItem
                            {...layout}
                            label="类型"
                            type="select"
                            name="target"
                            options={menuTargetOptions}
                            tooltip="指定类型之后，将以乾坤子项目或第三方网站方式打开"
                            required
                        />
                        <FormItem
                            {...layout}
                            label="标题"
                            name="title"
                            required
                            tooltip="菜单标题"
                        />
                        <FormItem
                            {...layout}
                            type="switch"
                            label="启用"
                            name="status"
                            required
                            tooltip="是否启用菜单"
                            valuePropName="checked"
                        />
                        <FormItem shouldUpdate noStyle>
                            {({getFieldValue}) => {
                                const target = getFieldValue('target');
                                if (target === menuTargetOptions.QIANKUN) {
                                    return (
                                        <>
                                            <FormItem
                                                {...layout}
                                                label="注册名称"
                                                tooltip="要与子应用package.json中声明的name属性相同，唯一不可重复"
                                                name="name"
                                                rules={[
                                                    {pattern: /^[0-9A-Za-z_-]+$/, message: '只允许英文大小写、_、-！'},
                                                ]}
                                                required
                                            />
                                            <FormItem
                                                {...layout}
                                                label="入口地址"
                                                tooltip="http(s)开头的网址"
                                                name="entry"
                                                rules={[
                                                    {
                                                        validator: (rule, value) => {
                                                            if (value && !value.startsWith('http')) return Promise.reject('请输入正确的入口地址！');
                                                            return Promise.resolve();
                                                        },
                                                    },
                                                ]}
                                                noSpace
                                                required
                                            />
                                        </>
                                    );
                                }

                                return (
                                    <FormItem
                                        {...layout}
                                        label="基础路径"
                                        name="basePath"
                                        tooltip="所有其子菜单路径将以此为前缀"
                                    />
                                );
                            }}
                        </FormItem>
                        <FormItem
                            {...layout}
                            label="路径"
                            name="path"
                            tooltip="菜单路径或第三方网站地址"
                        />
                        <FormItem
                            {...layout}
                            type="number"
                            label="排序"
                            name="order"
                            tooltip="降序，越大越靠前"
                        />
                    </>
                ) : (
                    <FormItem
                        labelCol={{flex: 0}}
                        type="textarea"
                        name="subMenus"
                        rows={16}
                        rules={[
                            {required: true, message: '请输入菜单数据！'},
                        ]}
                        style={{height: textAreaHeight}}
                        placeholder={`批量添加子菜单，结构如下：
[
    {id: 'system', title: '系统管理', order: 900},
    {id: 'user', parentId: 'system', title: '用户管理', path: '/users', order: 900},
    {id: 'menus', parentId: 'system', title: '菜单管理', path: '/menus', order: 900},
    {id: 'role', parentId: 'system', title: '角色管理', path: '/roles', order: 900},
    {
        id: 'demo', parentId: 'system', title: '测试子应用',
        target: 'qiankun',

        name: 'react-admin',
        entry: 'http://localhost:3000',

        order: 850,
    },
]
                            `}
                    />
                )}
            </Content>
            <Space className={styles.footerAction}>
                {!isAdd ? (
                    <Popconfirm title="您确定删除？" onConfirm={handleDelete}>
                        <Button loading={loading} danger>删除</Button>
                    </Popconfirm>
                ) : null}
                <Button loading={loading} type="primary" htmlType="submit">保存</Button>
            </Space>
        </Form>
    );
});