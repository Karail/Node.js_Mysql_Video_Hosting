import React from 'react'

import { LoginModal } from '../../../components/Modal/Login/LoginModal'
import { setCookie } from '../../../func/cookie'

type PropsType = {
    serverURL: string
    closeModal: () => void
    openModal: any
}

class LoginModalContainer extends React.Component<PropsType> {

    login = async (e: any) => {
        try {
            e.preventDefault()
            const { serverURL, closeModal } = this.props
            const formData = new FormData(e.target)

            const response = await fetch(`${serverURL}/login`, {
                method: 'POST',
                body: formData,
            })
            const data = await response.json();
            console.log(data)

            if (data.token) {
                setCookie('token', data.token, { 'max-age': 3000 })
                closeModal()
            }

        } catch (err) {
            console.log(err)
        }
    }

    render() {
        return (
            <LoginModal {...this.props} login={this.login} />
        )
    }
}

export default LoginModalContainer